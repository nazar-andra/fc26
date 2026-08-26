const legacyStorageKey = "fc26-bracket-state-v3";
const viewOnly =
  new URLSearchParams(window.location.search).get("view") === "1";
const stateApiUrl = viewOnly ? "/api/state?view=1" : "/api/state";
const scheduleApiUrl = viewOnly ? "/api/schedule?view=1" : "/api/schedule";
const teamNamesApiUrl = viewOnly ? "/api/team-names?view=1" : "/api/team-names";

if (viewOnly) {
  document.body.classList.add("view-only");
}

const teamCountOptions = [49, 64];

const exampleRoster49 = [
  17, 28, 10, 29, 24, 48, 35, 49, 25, 37, 34, 41, 21, 23, 45, 15, 3, 11, 30, 44,
  9, 13, 19, 47, 32, 12, 5, 43, 33, 36, 40, 38, 39, 16, 7, 27, 31, 46, 22, 26,
  8, 6, 2, 42, 20, 18, 4, 1, 14,
];

const defaultState = {
  title: "eSport FIFA 26 Turnamen HUT AirNav ke-14",
  teamCount: 49,
  teams: makeTeams(49),
  scores: {},
};

const els = {
  tournamentName: document.getElementById("tournamentName"),
  teamCount: document.getElementById("teamCount"),
  resetRoster: document.getElementById("resetRoster"),
  loadExample: document.getElementById("loadExample"),
  clearScores: document.getElementById("clearScores"),
  viewOnly: document.getElementById("viewOnly"),
  sidebar: document.getElementById("sidebar"),
  mobileMenuToggle: document.getElementById("mobileMenuToggle"),
  mobileMenuOverlay: document.getElementById("mobileMenuOverlay"),
  boardHead: document.getElementById("boardHead"),
  teamList: document.getElementById("teamList"),
  teamMeta: document.getElementById("teamMeta"),
  boardTitle: document.getElementById("boardTitle"),
  completedCount: document.getElementById("completedCount"),
  completionPct: document.getElementById("completionPct"),
  progressBar: document.getElementById("progressBar"),
  bracket: document.getElementById("bracket"),
  bracketLines: document.getElementById("bracketLines"),
  roundsGrid: document.getElementById("roundsGrid"),
  thirdPlaceHost: document.getElementById("thirdPlaceHost"),
  podium: document.getElementById("podium"),
  boardSubtitle: document.getElementById("boardSubtitle"),
  progressTrack: document.getElementById("progressTrack"),
  bracketView: document.getElementById("bracketView"),
  scheduleView: document.getElementById("scheduleView"),
  scheduleContent: document.getElementById("scheduleContent"),
  scheduleMeta: document.getElementById("scheduleMeta"),
  scheduleSubtitle: document.getElementById("scheduleSubtitle"),
  mappingView: document.getElementById("mappingView"),
  rulesView: document.getElementById("rulesView"),
  mappingRandomize: document.getElementById("randomizeMapping"),
  mappingReset: document.getElementById("resetMapping"),
  mappingLock: document.getElementById("toggleMappingLock"),
  mappingMeta: document.getElementById("mappingMeta"),
  mappingContent: document.getElementById("mappingContent"),
  teamMappingModal: document.getElementById("teamMappingModal"),
  closeTeamMapping: document.getElementById("closeTeamMapping"),
  teamMappingTitle: document.getElementById("teamMappingTitle"),
  teamMappingContent: document.getElementById("teamMappingContent"),
};

let state = structuredClone(defaultState);
let bracketDrawFrame = 0;
let currentBracketData = { rounds: [], thirdPlace: null };
let bracketResizeObserver = null;
let saveQueue = Promise.resolve();
let teamNamesSaveQueue = Promise.resolve();
let scheduleData = null;
let mappingNames = [];

initialize();

async function initialize() {
  mappingNames = await loadTeamNames();
  state = await loadState();
  if (!Array.isArray(state.mapping) || state.mapping.length === 0) {
    state.mapping = createEmptyMapping();
  }
  await persist();
  scheduleData = await loadSchedule();
  els.tournamentName.value = state.title;
  els.teamCount.value = String(state.teamCount);

  els.tournamentName.addEventListener("input", (event) => {
    state.title = event.target.value;
    persist();
    render();
  });

  els.teamCount.addEventListener("change", (event) => {
    const nextCount = Number(event.target.value);
    state = {
      title: state.title,
      teamCount: nextCount,
      teams: makeTeams(nextCount),
      scores: {},
      mapping: createEmptyMapping(),
      mappingLocked: false,
    };
    els.teamCount.value = String(nextCount);
    persist();
    render();
  });

  els.resetRoster.addEventListener("click", () => {
    state.teams = makeTeams(state.teamCount);
    persist();
    render();
  });

  els.loadExample.addEventListener("click", () => {
    loadExampleRoster();
  });

  els.clearScores.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Hapus semua skor pertandingan? Data skor yang sudah dihapus tidak dapat dipulihkan.",
    );
    if (!confirmed) return;

    state.scores = {};
    persist();
    render();
  });

  els.viewOnly.addEventListener("click", () => {
    window.open(
      `${window.location.origin}${window.location.pathname}?view=1`,
      "_blank",
    );
  });

  els.mobileMenuToggle.addEventListener("click", () => toggleMobileMenu());
  els.mobileMenuOverlay.addEventListener("click", () => toggleMobileMenu(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") toggleMobileMenu(false);
  });

  els.mappingRandomize.addEventListener("click", () => {
    state.mapping = createRandomMapping();
    persist();
    renderMapping();
  });

  els.mappingReset.addEventListener("click", () => {
    const confirmed = window.confirm("Reset semua mapping nama tim?");
    if (!confirmed) return;

    state.mapping = createEmptyMapping();
    persist();
    renderMapping();
  });

  els.mappingLock.addEventListener("click", () => {
    if (state.mappingLocked) {
      state.mappingLocked = false;
    } else {
      const hasAssignedMapping = Array.isArray(state.mapping) &&
        state.mapping.some((item) => Number.isInteger(item?.teamNumber));
      if (!hasAssignedMapping) state.mapping = createRandomMapping();
      state.mappingLocked = true;
    }
    persist();
    renderMapping();
  });

  els.closeTeamMapping.addEventListener("click", () => {
    els.teamMappingModal.close();
  });

  els.teamMappingModal.addEventListener("click", (event) => {
    if (event.target === els.teamMappingModal) {
      els.teamMappingModal.close();
    }
  });

  document.querySelectorAll(".view-tab").forEach((tab) => {
    tab.addEventListener("click", () => setActiveView(tab.dataset.view));
  });

  if (window.ResizeObserver) {
    bracketResizeObserver = new ResizeObserver(() => scheduleBracketLines());
    bracketResizeObserver.observe(els.bracket);
  }

  window.addEventListener("resize", scheduleBracketLines, { passive: true });

  render();
}

async function loadSchedule() {
  try {
    const response = await fetch(scheduleApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load schedule data");
    return await response.json();
  } catch (error) {
    return { error: error.message, sections: [] };
  }
}

async function loadTeamNames() {
  try {
    const response = await fetch(teamNamesApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load team names");
    return await response.json();
  } catch {
    return [];
  }
}

function setActiveView(view) {
  toggleMobileMenu(false);
  const isSchedule = view === "schedule";
  const isMapping = view === "mapping";
  const isRules = view === "rules";
  els.bracketView.hidden = isSchedule || isMapping || isRules;
  els.scheduleView.hidden = !isSchedule;
  els.mappingView.hidden = !isMapping;
  els.rulesView.hidden = !isRules;
  els.boardHead.hidden = isMapping || isRules;
  els.progressTrack.hidden = isSchedule || isMapping || isRules;

  document.querySelectorAll(".view-tab").forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

function toggleMobileMenu(force) {
  const shouldOpen = typeof force === "boolean"
    ? force
    : !els.sidebar.classList.contains("is-open");
  els.sidebar.classList.toggle("is-open", shouldOpen);
  els.mobileMenuOverlay.hidden = !shouldOpen;
  els.mobileMenuToggle.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function renderSchedule() {
  if (!els.scheduleContent || !scheduleData) return;

  els.scheduleContent.replaceChildren();

  if (scheduleData.error) {
    const error = document.createElement("p");
    error.className = "schedule-empty";
    error.textContent = "Jadwal belum dapat dimuat dari server.";
    els.scheduleContent.append(error);
    return;
  }

  const totalMatches = scheduleData.sections.reduce(
    (total, section) => total + section.matches.length,
    0,
  );
  els.scheduleSubtitle.textContent =
    scheduleData.subtitle || "Jadwal pertandingan turnamen";
  els.scheduleMeta.textContent = `${totalMatches} pertandingan terjadwal`;

  scheduleData.sections.forEach((section) => {
    const sectionEl = document.createElement("article");
    sectionEl.className = "schedule-section";

    const heading = document.createElement("div");
    heading.className = "schedule-section-head";

    const title = document.createElement("h4");
    title.textContent = section.title;
    heading.append(title);

    if (section.note) {
      const note = document.createElement("p");
      note.textContent = section.note;
      heading.append(note);
    }

    const table = document.createElement("table");
    table.className = "schedule-table";
    table.innerHTML = `
      <thead>
        <tr><th>Match</th><th>Waktu</th><th>Pertandingan</th></tr>
      </thead>
    `;
    const body = document.createElement("tbody");

    section.matches.forEach((match) => {
      const liveMatch = findScheduledBracketMatch(match.id);
      const row = document.createElement("tr");
      const participantLabel = liveMatch
        ? getLiveMatchLabel(liveMatch)
        : formatScheduleMatchLabel(match.match);
      [match.id, match.time, participantLabel].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      if (liveMatch) row.classList.add("schedule-live");
      body.append(row);
    });

    table.append(body);
    sectionEl.append(heading, table);
    els.scheduleContent.append(sectionEl);
  });
}

function renderMapping() {
  if (!els.mappingContent) return;

  els.mappingContent.replaceChildren();
  const mapping = Array.isArray(state.mapping) ? state.mapping : [];
  const isLocked = Boolean(state.mappingLocked);
  els.mappingRandomize.hidden = isLocked;
  els.mappingReset.hidden = isLocked;
  els.mappingLock.textContent = isLocked ? "Unlock mapping" : "Lock mapping";
  els.mappingLock.classList.toggle("is-locked", isLocked);
  els.mappingLock.setAttribute("aria-pressed", String(isLocked));
  els.mappingMeta.textContent = `${mapping.length} nama terpasang`;

  if (!mapping.length) {
    const empty = document.createElement("p");
    empty.className = "mapping-empty";
    empty.textContent = "Belum ada mapping nama tim.";
    els.mappingContent.append(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "mapping-table";
  table.innerHTML = `
    <thead><tr><th>No.</th><th>Nama tim</th><th>Masuk ke</th></tr></thead>
  `;
  const body = document.createElement("tbody");

  mapping.forEach((item, index) => {
    const row = document.createElement("tr");
    const assignedTeam = item.teamNumber
      ? `Tim ${String(item.teamNumber).padStart(2, "0")}`
      : "Belum ditetapkan";

    const numberCell = document.createElement("td");
    numberCell.textContent = String(index + 1);

    const nameCell = document.createElement("td");
    const input = document.createElement("input");
    input.className = "mapping-name-input";
    input.type = "text";
    input.value = item.name || "";
    input.placeholder = `Nama tim ${index + 1}`;
    input.disabled = viewOnly;
    input.addEventListener("input", (event) => {
      const nextName = event.target.value;
      mappingNames[index] = nextName;
      if (state.mapping[index]) state.mapping[index].name = nextName;
      persistTeamNames();
      persist();
    });
    nameCell.append(input);

    const assignedCell = document.createElement("td");
    assignedCell.textContent = assignedTeam;
    row.append(numberCell, nameCell, assignedCell);
    body.append(row);
  });

  table.append(body);
  els.mappingContent.append(table);
}

function createRandomMapping() {
  const numbers = Array.from(
    { length: Math.min(mappingNames.length, state.teamCount) },
    (_, index) => index + 1,
  );
  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [numbers[index], numbers[randomIndex]] = [
      numbers[randomIndex],
      numbers[index],
    ];
  }

  return mappingNames.slice(0, numbers.length).map((name, index) => ({
    name,
    teamNumber: numbers[index],
  }));
}

function createEmptyMapping() {
  return mappingNames.map((name) => ({ name, teamNumber: null }));
}

function findScheduledBracketMatch(scheduleId) {
  const number = Number(scheduleId.match(/M(\d+)/)?.[1]);
  if (!Number.isFinite(number)) return null;

  if (number >= 1 && number <= 17) return findBracketMatch("r0", number + 14);
  if (number >= 18 && number <= 33) return findBracketMatch("r1", number - 18);
  if (number >= 34 && number <= 41) return findBracketMatch("r2", number - 34);
  if (number >= 42 && number <= 45) return findBracketMatch("r3", number - 42);
  if (number >= 46 && number <= 47) return findBracketMatch("r4", number - 46);
  if (number === 48) return currentBracketData.thirdPlace || null;
  if (number === 49) return findBracketMatch("r5", 0);
  return null;
}

function findBracketMatch(roundId, matchIndex) {
  return (
    currentBracketData.rounds
      .flatMap((round) => round.matches)
      .find((match) => match.id === `${roundId}m${matchIndex}`) || null
  );
}

function getLiveMatchLabel(match) {
  return (match.participants || [])
    .map((participant) => {
      if (!participant || participant.isPending) return "Menunggu hasil";
      if (participant.isBye) return "BYE";
      return formatScheduleTeamLabel(participant.name) || "Menunggu hasil";
    })
    .join(" vs ");
}

function formatScheduleMatchLabel(label) {
  if (typeof label !== "string") return label;

  return label
    .split(/\s+vs\s+/i)
    .map((participant) => formatScheduleTeamLabel(participant) || participant)
    .join(" vs ");
}

function formatScheduleTeamLabel(label) {
  if (typeof label !== "string") return "";

  const teamMatch = label.trim().match(/^Tim\s*0*(\d+)$/i);
  if (!teamMatch) return label.trim();

  const teamNumber = Number(teamMatch[1]);
  const mappedTeam = state.mapping?.find(
    (item) => item?.teamNumber === teamNumber && item.name?.trim(),
  );
  const teamLabel = `Tim ${teamNumber}`;

  return mappedTeam ? `${teamLabel} (${mappedTeam.name.trim()})` : teamLabel;
}

function makeTeams(count) {
  if (count === 49) {
    return exampleRoster49.map((teamNumber, index) => ({
      id: `team-${index + 1}`,
      name: `Tim ${String(teamNumber).padStart(2, "0")}`,
      isBye: false,
    }));
  }

  const order = buildRosterOrder(count);

  return order.map((teamNumber, index) => ({
    id: `team-${index + 1}`,
    name: `Tim ${String(teamNumber).padStart(2, "0")}`,
    isBye: false,
  }));
}

function normalizeState(input) {
  const requestedTeamCount = Number(input.teamCount);
  const isLegacyUntouchedDefault =
    requestedTeamCount === 64 &&
    Array.isArray(input.teams) &&
    input.teams.length === 64 &&
    input.teams.every(
      (team, index) =>
        typeof team?.name === "string" &&
        team.name.trim() === `Tim ${String(index + 1).padStart(2, "0")}` &&
        !team.isBye,
    ) &&
    Object.keys(input.scores || {}).length === 0 &&
    typeof input.title === "string" &&
    input.title.trim() === defaultState.title;

  const teamCount = isLegacyUntouchedDefault
    ? defaultState.teamCount
    : teamCountOptions.includes(requestedTeamCount)
      ? requestedTeamCount
      : defaultState.teamCount;
  const hasStoredTeams =
    Array.isArray(input.teams) && input.teams.length === teamCount;
  const storedTeams = hasStoredTeams
    ? input.teams.map((team, index) => ({
        id: team.id || `team-${index + 1}`,
        name:
          typeof team.name === "string" && team.name.trim()
            ? team.name
            : `Tim ${String(index + 1).padStart(2, "0")}`,
        isBye: Boolean(team.isBye),
      }))
    : null;
  const teams =
    storedTeams && !looksLikeUntouchedDefaultRoster(input, storedTeams)
      ? storedTeams
      : makeTeams(teamCount);

  return {
    title:
      typeof input.title === "string" && input.title.trim()
        ? input.title
        : defaultState.title,
    teamCount,
    teams,
    scores:
      typeof input.scores === "object" && input.scores ? input.scores : {},
    mapping: normalizeMapping(input.mapping),
    mappingLocked: Boolean(input.mappingLocked),
  };
}

function normalizeMapping(inputMapping) {
  if (
    !Array.isArray(inputMapping) ||
    inputMapping.length !== mappingNames.length
  )
    return [];

  return inputMapping.map((item, index) => ({
    name: mappingNames[index],
    teamNumber: Number.isInteger(item?.teamNumber) ? item.teamNumber : null,
  }));
}

function looksLikeUntouchedDefaultRoster(input, teams) {
  if (
    typeof input.title !== "string" ||
    input.title.trim() !== defaultState.title
  )
    return false;
  if (!Array.isArray(teams) || teams.length !== defaultState.teamCount)
    return false;
  if (Object.keys(input.scores || {}).length > 0) return false;

  return teams.every(
    (team, index) =>
      team.name === `Tim ${String(index + 1).padStart(2, "0")}` && !team.isBye,
  );
}

async function loadState() {
  try {
    const response = await fetch(stateApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load server state");

    const remoteState = await response.json();
    if (remoteState && remoteState.teamCount) {
      return normalizeState(remoteState);
    }

    const legacyRaw = localStorage.getItem(legacyStorageKey);
    return legacyRaw
      ? normalizeState(JSON.parse(legacyRaw))
      : structuredClone(defaultState);
  } catch {
    try {
      const legacyRaw = localStorage.getItem(legacyStorageKey);
      return legacyRaw
        ? normalizeState(JSON.parse(legacyRaw))
        : structuredClone(defaultState);
    } catch {
      return structuredClone(defaultState);
    }
  }
}

function persist() {
  const snapshot = structuredClone(state);
  saveQueue = saveQueue
    .catch(() => {})
    .then(() =>
      fetch(stateApiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      }),
    )
    .then((response) => {
      if (!response.ok) throw new Error("Could not save server state");
    })
    .catch((error) => {
      console.error(error);
    });

  return saveQueue;
}

function persistTeamNames() {
  const snapshot = [...mappingNames];
  teamNamesSaveQueue = teamNamesSaveQueue
    .catch(() => {})
    .then(() =>
      fetch(teamNamesApiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      }),
    )
    .then((response) => {
      if (!response.ok) throw new Error("Could not save team names");
    })
    .catch((error) => {
      console.error(error);
    });

  return teamNamesSaveQueue;
}

function render() {
  els.tournamentName.value = state.title;
  els.teamCount.value = String(state.teamCount);
  els.boardSubtitle.textContent = state.title || "Editable tournament board";

  renderTeamList();
  renderBracket();
  renderSchedule();
  renderMapping();
}

function renderTeamList() {
  const byeCount =
    Math.max(nextPowerOfTwo(state.teams.length) - state.teams.length, 0) +
    countRosterByes(state.teams);
  els.teamMeta.textContent = `${state.teams.length} tim, ${byeCount} bye`;
  els.teamList.innerHTML = "";

  state.teams.forEach((team, index) => {
    const row = document.createElement("div");
    row.className = `team-row${team.isBye ? " bye" : ""}`;

    const seed = document.createElement("div");
    seed.className = "team-seed";
    seed.textContent = `${index + 1}`;

    const input = document.createElement("input");
    input.className = "team-input";
    input.type = "text";
    input.value = team.name;
    input.placeholder = `Tim ${index + 1}`;
    input.disabled = Boolean(team.isBye);
    input.addEventListener("input", (event) => {
      state.teams[index].name = event.target.value;
      persist();
      renderBracket();
      renderSchedule();
    });

    const byeToggle = document.createElement("button");
    byeToggle.type = "button";
    byeToggle.className = "bye-toggle";
    byeToggle.textContent = team.isBye ? "BYE" : "Set bye";
    byeToggle.setAttribute("aria-pressed", String(Boolean(team.isBye)));
    byeToggle.addEventListener("click", () => {
      state.teams[index].isBye = !state.teams[index].isBye;
      if (state.teams[index].isBye) {
        state.teams[index].name = `Tim ${String(index + 1).padStart(2, "0")}`;
      }
      persist();
      render();
    });

    row.append(seed, input, byeToggle);
    els.teamList.append(row);
  });
}

function loadExampleRoster() {
  state = {
    title: defaultState.title,
    teamCount: 49,
    teams: makeTeams(49),
    scores: {},
    mapping: createEmptyMapping(),
    mappingLocked: false,
  };

  els.teamCount.value = "49";
  persist();
  render();
}

function renderBracket() {
  const bracketData = buildBracket();
  currentBracketData = bracketData;
  const allMatches = bracketData.rounds.flatMap((round) => round.matches);
  if (bracketData.thirdPlace) {
    allMatches.push(bracketData.thirdPlace);
  }
  const totalMatches = allMatches.length;
  const completedMatches = allMatches.filter((match) => match.winner).length;
  const percent = totalMatches
    ? Math.round((completedMatches / totalMatches) * 100)
    : 0;

  els.completedCount.textContent = `${completedMatches} / ${totalMatches}`;
  els.completionPct.textContent = `${percent}%`;
  els.progressBar.style.width = `${percent}%`;

  els.roundsGrid.replaceChildren();
  els.thirdPlaceHost.replaceChildren();
  els.bracketLines.replaceChildren();

  bracketData.rounds.forEach((round, roundIndex) => {
    const roundEl = document.createElement("section");
    roundEl.className = "round";
    roundEl.dataset.roundIndex = String(roundIndex);
    const matchHeight = 52;
    const baseStep = matchHeight + 6;
    const branchScale = 2 ** roundIndex;
    roundEl.style.setProperty(
      "--round-offset",
      `${roundIndex ? ((branchScale - 1) * baseStep) / 2 : 0}px`,
    );
    roundEl.style.setProperty(
      "--match-gap",
      `${branchScale * baseStep - matchHeight}px`,
    );

    const title = document.createElement("div");
    title.className = "round-title";
    title.innerHTML = `<span>${round.shortLabel}</span>${round.label}`;

    const matchesEl = document.createElement("div");
    matchesEl.className = "matches";

    round.matches.forEach((match, matchIndex) => {
      matchesEl.append(renderMatch(match, roundIndex, matchIndex));
    });

    roundEl.append(title, matchesEl);
    els.roundsGrid.append(roundEl);
  });

  if (bracketData.thirdPlace) {
    els.thirdPlaceHost.append(renderThirdPlaceMatch(bracketData.thirdPlace));
  }

  renderPodium(bracketData);

  scheduleBracketLines();
}

function renderPodium(bracketData) {
  if (!els.podium) return;

  els.podium.replaceChildren();

  const finalRound = bracketData.rounds.at(-1);
  const finalMatch = finalRound?.matches.at(-1) || null;
  const finalWinner = finalMatch?.winner || null;
  const finalLoser = finalWinner && finalMatch?.participants
    ? finalMatch.participants.find((participant) => participant.id !== finalWinner.id)
    : null;
  const thirdWinner = bracketData.thirdPlace?.winner || null;

  const heading = document.createElement("div");
  heading.className = "podium-head";

  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Final standings";

  const title = document.createElement("h3");
  title.textContent = "Hasil akhir turnamen";
  heading.append(eyebrow, title);

  const grid = document.createElement("div");
  grid.className = "podium-grid";
  grid.append(
    renderPodiumCard("1", "Juara 1", finalWinner, "Pemenang final", "gold"),
    renderPodiumCard("2", "Juara 2", finalLoser, "Kalah di final", "silver"),
    renderPodiumCard("3", "Juara 3", thirdWinner, "Pemenang perebutan juara 3", "bronze"),
  );

  els.podium.append(heading, grid);
}

function renderPodiumCard(rank, label, participant, source, tone) {
  const card = document.createElement("article");
  card.className = `podium-card podium-${tone}`;

  const rankEl = document.createElement("div");
  rankEl.className = "podium-rank";
  rankEl.textContent = rank;

  const copy = document.createElement("div");
  copy.className = "podium-copy";

  const labelEl = document.createElement("div");
  labelEl.className = "podium-label";
  labelEl.textContent = label;

  const name = document.createElement("strong");
  name.className = participant ? "podium-name" : "podium-name is-pending";
  name.textContent = participant ? getPodiumDisplayName(participant) : "Menunggu hasil";

  const teamId = document.createElement("span");
  teamId.className = "podium-team-id";
  teamId.textContent = participant ? getPodiumTeamLabel(participant) : "";

  const sourceEl = document.createElement("span");
  sourceEl.className = "podium-source";
  sourceEl.textContent = participant ? source : "Pertandingan belum selesai";

  copy.append(labelEl, name, teamId, sourceEl);
  card.append(rankEl, copy);
  return card;
}

function getPodiumDisplayName(participant) {
  if (!participant?.name) return "Menunggu hasil";

  const teamNumber = getTeamNumber(participant.name);
  const mappedTeam = teamNumber === null
    ? null
    : state.mapping?.find(
      (item) => item?.teamNumber === teamNumber && item.name?.trim(),
    );

  return mappedTeam?.name?.trim() || participant.name;
}

function getPodiumTeamLabel(participant) {
  const teamNumber = getTeamNumber(participant?.name);
  if (teamNumber === null) return "";
  return `Tim ${String(teamNumber).padStart(2, "0")}`;
}

function renderMatch(match, roundIndex, matchIndex) {
  const matchEl = document.createElement("article");
  matchEl.className = `match${match.kind === "third-place" ? " third-place-card" : ""}`;
  matchEl.dataset.roundIndex = String(roundIndex);
  matchEl.dataset.matchIndex = String(matchIndex);

  const head = document.createElement("div");
  head.className = "match-head";

  const title = document.createElement("div");
  title.className = "match-title";
  title.textContent =
    match.kind === "third-place" ? "3rd place match" : `Match ${match.label}`;

  const status = document.createElement("div");
  status.className = `match-status${match.isTie ? " tie" : ""}`;
  status.textContent = match.statusLabel;

  head.append(title, status);
  matchEl.setAttribute(
    "aria-label",
    `${title.textContent}, ${status.textContent}`,
  );

  const slots = document.createElement("div");
  slots.className = "slots";

  slots.append(renderSlot(match, 0), renderSlot(match, 1));

  const note = document.createElement("div");
  note.className = "match-note";
  note.textContent = match.note || "";

  matchEl.append(head, slots, note);
  return matchEl;
}

function renderThirdPlaceMatch(match) {
  const wrapper = document.createElement("section");
  wrapper.className = "third-place";

  const title = document.createElement("div");
  title.className = "third-place-title";
  title.textContent = "3rd place match";

  wrapper.append(title, renderMatch(match, "third", 0));
  return wrapper;
}

function scheduleBracketLines() {
  if (bracketDrawFrame) {
    cancelAnimationFrame(bracketDrawFrame);
  }

  bracketDrawFrame = requestAnimationFrame(() => {
    bracketDrawFrame = 0;
    drawBracketLines(currentBracketData);
  });
}

function drawBracketLines(bracketData) {
  if (!els.bracketLines) return;

  const bracketNode = els.bracket;
  const width = Math.max(bracketNode.scrollWidth, bracketNode.clientWidth);
  const height = Math.max(bracketNode.scrollHeight, bracketNode.clientHeight);

  els.bracketLines.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.bracketLines.setAttribute("width", String(width));
  els.bracketLines.setAttribute("height", String(height));
  els.bracketLines.setAttribute("preserveAspectRatio", "none");
  els.bracketLines.replaceChildren();

  const bracketRect = bracketNode.getBoundingClientRect();
  const lineColor = "rgba(156, 180, 220, 0.92)";

  for (
    let roundIndex = 0;
    roundIndex < bracketData.rounds.length - 1;
    roundIndex += 1
  ) {
    const targetRound = bracketData.rounds[roundIndex + 1];
    const firstTarget = bracketNode.querySelector(
      `.match[data-round-index="${roundIndex + 1}"][data-match-index="0"]`,
    );
    const firstSource = bracketNode.querySelector(
      `.match[data-round-index="${roundIndex}"][data-match-index="0"]`,
    );

    if (!firstTarget || !firstSource) continue;

    const firstTargetRect = firstTarget.getBoundingClientRect();
    const firstSourceRect = firstSource.getBoundingClientRect();
    const phaseGapStart = firstSourceRect.right - bracketRect.left;
    const phaseGapEnd = firstTargetRect.left - bracketRect.left;
    const corridorX = phaseGapStart + (phaseGapEnd - phaseGapStart) / 2;

    targetRound.matches.forEach((_, targetIndex) => {
      const sourceA = bracketNode.querySelector(
        `.match[data-round-index="${roundIndex}"][data-match-index="${targetIndex * 2}"]`,
      );
      const sourceB = bracketNode.querySelector(
        `.match[data-round-index="${roundIndex}"][data-match-index="${targetIndex * 2 + 1}"]`,
      );
      const target = bracketNode.querySelector(
        `.match[data-round-index="${roundIndex + 1}"][data-match-index="${targetIndex}"]`,
      );

      if (!sourceA || !sourceB || !target) return;

      const rectA = sourceA.getBoundingClientRect();
      const rectB = sourceB.getBoundingClientRect();
      const rectT = target.getBoundingClientRect();

      const startAX = rectA.right - bracketRect.left;
      const startAY = rectA.top - bracketRect.top + rectA.height / 2;
      const startBX = rectB.right - bracketRect.left;
      const startBY = rectB.top - bracketRect.top + rectB.height / 2;
      const targetX = rectT.left - bracketRect.left;
      const targetY = rectT.top - bracketRect.top + rectT.height / 2;
      // Finish on the target edge so the connector visibly joins the next match.
      const targetGap = 0;
      const targetLead = targetX - targetGap;
      const joinY = (startAY + startBY) / 2;

      // Every phase uses one fixed vertical corridor. This keeps branches
      // parallel and leaves a predictable gap before the next round.
      appendBracketPath(`M ${startAX} ${startAY} H ${corridorX}`, lineColor);
      appendBracketPath(`M ${startBX} ${startBY} H ${corridorX}`, lineColor);
      appendBracketPath(
        `M ${corridorX} ${Math.min(startAY, startBY)} V ${Math.max(startAY, startBY)}`,
        lineColor,
      );
      appendBracketPath(
        `M ${corridorX} ${joinY} H ${targetLead} V ${targetY}`,
        lineColor,
      );
    });
  }
}

function appendBracketPath(d, stroke) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.35");
  path.setAttribute("stroke-linecap", "square");
  path.setAttribute("stroke-linejoin", "miter");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  els.bracketLines.append(path);
}

function renderSlot(match, slotIndex) {
  const participant = match.participants[slotIndex];
  const wrapper = document.createElement("div");
  wrapper.className = "slot";
  if (participant?.winner) {
    wrapper.classList.add("winner");
  }

  const body = document.createElement("div");
  body.className = "slot-body";

  const label = document.createElement("div");
  label.className = "slot-label";
  label.textContent = slotIndex === 0 ? "Home" : "Away";

  const name = document.createElement(
    participant?.name && !participant.isBye && !participant.isPending
      ? "button"
      : "div",
  );
  name.className = "slot-name";
  name.textContent = formatBracketName(participant?.name, participant);

  if (name instanceof HTMLButtonElement) {
    name.type = "button";
    name.classList.add("team-name-trigger");
    name.title = "Lihat mapping tim";
    name.addEventListener("click", () => openTeamMappingModal(participant));
  }

  if (participant?.winner) {
    name.classList.add("winner");
  } else if (!participant?.name || participant.isBye || participant.isPending) {
    name.classList.add("bye");
  }

  body.append(label, name);

  const score = document.createElement("input");
  score.className = "score-input";
  score.type = "number";
  score.min = "0";
  score.step = "1";
  score.inputMode = "numeric";
  score.placeholder = "0";
  score.value = match.score[slotIndex] ?? "";
  score.readOnly = viewOnly;
  score.disabled =
    participant?.isBye || participant?.isPending || !match.isPlayable;
  score.setAttribute(
    "aria-label",
    `${match.label} ${slotIndex === 0 ? "home" : "away"} score`,
  );
  score.addEventListener("input", (event) => {
    setScore(match.id, slotIndex, event.target.value);
  });

  wrapper.append(body, score);
  return wrapper;
}

function formatBracketName(name, participant) {
  if (!name) return participant?.isPending ? "—" : "TBD";
  if (participant?.isBye) return "—";
  if (participant?.isPending) return "—";
  if (/^Tim\s+\d+$/i.test(name)) {
    return `#${name.replace(/\s+/g, "")}`;
  }
  return name;
}

function openTeamMappingModal(participant) {
  if (!els.teamMappingModal || !els.teamMappingContent) return;

  const teamNumber = getTeamNumber(participant?.name);
  const teamLabel = teamNumber === null
    ? (participant?.name || "Tim")
    : `Tim ${teamNumber}`;
  const mappedTeam = teamNumber === null
    ? null
    : state.mapping?.find(
      (item) => item?.teamNumber === teamNumber && item.name?.trim(),
    );

  els.teamMappingTitle.textContent = teamLabel;
  els.teamMappingContent.replaceChildren();

  const label = document.createElement("span");
  label.className = "team-mapping-label";
  label.textContent = "Nama mapping";

  const value = document.createElement("strong");
  value.className = mappedTeam ? "team-mapping-value" : "team-mapping-value is-empty";
  value.textContent = mappedTeam
    ? mappedTeam.name.trim()
    : "Belum ada mapping untuk tim ini";

  els.teamMappingContent.append(label, value);
  els.teamMappingModal.showModal();
}

function getTeamNumber(label) {
  if (typeof label !== "string") return null;
  const match = label.trim().match(/^Tim\s*0*(\d+)$/i);
  if (!match) return null;

  const number = Number(match[1]);
  return Number.isInteger(number) ? number : null;
}

function setScore(matchId, slotIndex, value) {
  const score = normalizeScoreValue(value);
  state.scores[matchId] ||= ["", ""];
  state.scores[matchId][slotIndex] = score;
  persist();
  renderBracket();
  renderSchedule();
}

function normalizeScoreValue(value) {
  if (value === "") return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return String(Math.floor(parsed));
}

function buildBracket() {
  const size = nextPowerOfTwo(Math.max(state.teams.length, 2));
  const rounds = Math.log2(size);
  const roundsData = [];

  if (state.teamCount === 49) {
    const firstRound = buildExample49FirstRound();
    roundsData.push(firstRound);

    let previousWinners = firstRound.matches.map((match) => match.winner);
    let semifinalRound = null;

    for (let roundIndex = 1; roundIndex < rounds; roundIndex += 1) {
      const roundMatches = [];
      const matchCount = previousWinners.length / 2;

      for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
        const id = `r${roundIndex}m${matchIndex}`;
        const sourceA = previousWinners[matchIndex * 2] || null;
        const sourceB = previousWinners[matchIndex * 2 + 1] || null;
        const participants = [
          sourceA || createPendingParticipant(),
          sourceB || createPendingParticipant(),
        ];
        const score = state.scores[id] || ["", ""];
        const isPlayable = canPlayMatch(participants);
        const winnerIndex = determineWinnerIndex(
          participants,
          score,
          isPlayable,
        );
        const winner = winnerIndex === null ? null : participants[winnerIndex];
        const statusLabel = buildStatusLabel(
          participants,
          score,
          winnerIndex,
          isPlayable,
        );
        const note = buildMatchNote(
          participants,
          score,
          winnerIndex,
          isPlayable,
        );

        roundMatches.push({
          id,
          label: `${matchIndex + 1}`,
          participants: participants.map((participant, index) =>
            participant
              ? { ...participant, winner: winnerIndex === index }
              : createPendingParticipant(),
          ),
          score,
          winner,
          isPlayable,
          isTie: isPlayable && isTieScore(score),
          statusLabel,
          note,
        });
      }

      roundsData.push({
        label: roundLabel(roundIndex, rounds),
        shortLabel: `R${roundIndex + 1}`,
        matches: roundMatches,
      });

      if (roundIndex === rounds - 2) {
        semifinalRound = roundMatches;
      }

      previousWinners = roundMatches.map((match) => match.winner);
    }

    return {
      rounds: roundsData,
      thirdPlace: buildThirdPlaceMatch(semifinalRound),
    };
  }

  const seedOrder = buildSeedOrder(size);
  const slots = seedOrder.map((seed) => {
    const team = state.teams[seed - 1];
    if (!team || team.isBye) return createByeParticipant(seed);
    return createTeamParticipant(team, seed);
  });

  let previousWinners = slots;
  let semifinalRound = null;

  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    const roundMatches = [];
    const matchCount = previousWinners.length / 2;

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      const id = `r${roundIndex}m${matchIndex}`;
      const sourceA = previousWinners[matchIndex * 2] || null;
      const sourceB = previousWinners[matchIndex * 2 + 1] || null;
      const participants = [
        sourceA ||
          (roundIndex === 0
            ? createByeParticipant()
            : createPendingParticipant()),
        sourceB ||
          (roundIndex === 0
            ? createByeParticipant()
            : createPendingParticipant()),
      ];
      const score = state.scores[id] || ["", ""];
      const isPlayable = canPlayMatch(participants);
      const winnerIndex = determineWinnerIndex(participants, score, isPlayable);
      const winner = winnerIndex === null ? null : participants[winnerIndex];
      const statusLabel = buildStatusLabel(
        participants,
        score,
        winnerIndex,
        isPlayable,
      );
      const note = buildMatchNote(participants, score, winnerIndex, isPlayable);

      roundMatches.push({
        id,
        label: `${matchIndex + 1}`,
        participants: participants.map((participant, index) =>
          participant
            ? { ...participant, winner: winnerIndex === index }
            : createPendingParticipant(),
        ),
        score,
        winner,
        isPlayable,
        isTie: isPlayable && isTieScore(score),
        statusLabel,
        note,
      });
    }

    roundsData.push({
      label: roundLabel(roundIndex, rounds),
      shortLabel: `R${roundIndex + 1}`,
      matches: roundMatches,
    });

    if (roundIndex === rounds - 2) {
      semifinalRound = roundMatches;
    }

    previousWinners = roundMatches.map((match) => match.winner);
  }

  return {
    rounds: roundsData,
    thirdPlace: buildThirdPlaceMatch(semifinalRound),
  };
}

function buildExample49FirstRound() {
  const matches = [];
  let semifinalRound = null;

  for (let matchIndex = 0; matchIndex < 32; matchIndex += 1) {
    const id = `r0m${matchIndex}`;
    const score = state.scores[id] || ["", ""];
    let participants;

    if (matchIndex < 15) {
      const team = state.teams[matchIndex] || null;
      const teamParticipant =
        team && !team.isBye
          ? createTeamParticipant(team, matchIndex + 1)
          : createByeParticipant(matchIndex + 1);
      participants = [teamParticipant, createByeParticipant(matchIndex + 1)];
    } else {
      const teamA = state.teams[15 + (matchIndex - 15) * 2] || null;
      const teamB = state.teams[16 + (matchIndex - 15) * 2] || null;
      participants = [
        teamA && !teamA.isBye
          ? createTeamParticipant(teamA, matchIndex + 1)
          : createByeParticipant(matchIndex + 1),
        teamB && !teamB.isBye
          ? createTeamParticipant(teamB, matchIndex + 1)
          : createByeParticipant(matchIndex + 1),
      ];
    }

    const isPlayable = canPlayMatch(participants);
    const winnerIndex = determineWinnerIndex(participants, score, isPlayable);
    const winner = winnerIndex === null ? null : participants[winnerIndex];
    const statusLabel = buildStatusLabel(
      participants,
      score,
      winnerIndex,
      isPlayable,
    );
    const note = buildMatchNote(participants, score, winnerIndex, isPlayable);

    matches.push({
      id,
      label: `${matchIndex + 1}`,
      participants: participants.map((participant, index) =>
        participant
          ? { ...participant, winner: winnerIndex === index }
          : createPendingParticipant(),
      ),
      score,
      winner,
      isPlayable,
      isTie: isPlayable && isTieScore(score),
      statusLabel,
      note,
    });
  }

  return {
    label: roundLabel(0, 6),
    shortLabel: "R1",
    matches,
  };
}

function canPlayMatch(participants) {
  return participants.every(
    (participant) => participant && !participant.isPending,
  );
}

function isTieScore(score) {
  const a = Number(score[0]);
  const b = Number(score[1]);
  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    a === b &&
    score[0] !== "" &&
    score[1] !== ""
  );
}

function determineWinnerIndex(participants, score, isPlayable) {
  if (!isPlayable) return null;

  const [a, b] = participants;
  if (a.isBye && !b.isBye) return 1;
  if (b.isBye && !a.isBye) return 0;
  if (a.isBye || b.isBye) return null;

  const scoreA = Number(score[0]);
  const scoreB = Number(score[1]);
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return null;
  if (scoreA === scoreB) return null;
  return scoreA > scoreB ? 0 : 1;
}

function buildStatusLabel(participants, score, winnerIndex, isPlayable) {
  if (!isPlayable) return "Waiting upstream";
  if (participants.some((participant) => participant?.isPending))
    return "Waiting upstream";
  if (participants[0]?.isBye && !participants[1]?.isBye)
    return "Advance by bye";
  if (participants[1]?.isBye && !participants[0]?.isBye)
    return "Advance by bye";
  if (winnerIndex === null) {
    if (isTieScore(score)) return "Tie - set tiebreaker";
    return "Waiting for score";
  }
  return `${participants[winnerIndex].name} leads`;
}

function buildMatchNote(participants, score, winnerIndex, isPlayable) {
  if (!isPlayable)
    return "This match is waiting for the round before it to finish.";
  if (participants.some((participant) => participant?.isPending))
    return "Winner from the previous round will appear here.";
  if (participants[0]?.isBye && !participants[1]?.isBye)
    return "Opponent slot is a bye.";
  if (participants[1]?.isBye && !participants[0]?.isBye)
    return "Opponent slot is a bye.";
  if (winnerIndex === null && isTieScore(score))
    return "Scores are level. Edit one side to advance a winner.";
  if (winnerIndex === null) return "Enter scores for both sides.";
  return "Winner will be fed into the next round automatically.";
}

function roundLabel(roundIndex, totalRounds) {
  if (totalRounds === 1) return "Final";
  if (roundIndex === totalRounds - 1) return "Final";
  if (roundIndex === totalRounds - 2) return "Semifinals";
  if (roundIndex === totalRounds - 3) return "Quarterfinals";

  const remaining = Math.pow(2, totalRounds - roundIndex);
  return `Round of ${remaining}`;
}

function nextPowerOfTwo(value) {
  let power = 1;
  while (power < value) {
    power *= 2;
  }
  return power;
}

function createTeamParticipant(team, seed) {
  return {
    id: team.id,
    name: team.name?.trim() || "Untitled team",
    isBye: false,
    isPending: false,
    seed: Number.isFinite(seed) ? seed : Number(team.id?.split("-")[1]) || null,
  };
}

function createByeParticipant(seed) {
  return {
    id: `bye-${seed ?? "x"}`,
    name: "—",
    isBye: true,
    isPending: false,
    seed,
  };
}

function createPendingParticipant() {
  return {
    id: "pending",
    name: "TBD",
    isBye: false,
    isPending: true,
  };
}

function countRosterByes(teams) {
  return Array.isArray(teams) ? teams.filter((team) => team?.isBye).length : 0;
}

function buildRosterOrder(count) {
  const order = Array.from({ length: count }, (_, index) => index + 1);
  let seed = 2026 + count;

  for (let index = order.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  return order;
}

function buildThirdPlaceMatch(semifinalRound) {
  if (!Array.isArray(semifinalRound) || semifinalRound.length < 2) {
    return null;
  }

  const participants = semifinalRound.map((match) => {
    if (!match || !Array.isArray(match.participants)) {
      return createPendingParticipant();
    }

    const winnerIndex = match.participants.findIndex(
      (participant) => participant?.winner,
    );
    if (winnerIndex < 0) {
      return createPendingParticipant();
    }

    return match.participants[1 - winnerIndex] || createPendingParticipant();
  });

  const score = state.scores["third-place"] || ["", ""];
  const isPlayable = canPlayMatch(participants);
  const winnerIndex = determineWinnerIndex(participants, score, isPlayable);
  const winner = winnerIndex === null ? null : participants[winnerIndex];
  const statusLabel = buildStatusLabel(
    participants,
    score,
    winnerIndex,
    isPlayable,
  );
  const note = buildMatchNote(participants, score, winnerIndex, isPlayable);

  return {
    id: "third-place",
    label: "3rd place",
    kind: "third-place",
    participants: participants.map((participant, index) =>
      participant
        ? { ...participant, winner: winnerIndex === index }
        : createPendingParticipant(),
    ),
    score,
    winner,
    isPlayable,
    isTie: isPlayable && isTieScore(score),
    statusLabel,
    note,
  };
}

function buildSeedOrder(size) {
  let order = [1, 2];

  while (order.length < size) {
    const nextSize = order.length * 2;
    const nextOrder = [];

    order.forEach((seed) => {
      nextOrder.push(seed);
      nextOrder.push(nextSize + 1 - seed);
    });

    order = nextOrder;
  }

  return order;
}
