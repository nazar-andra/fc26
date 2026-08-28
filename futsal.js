const viewOnly = new URLSearchParams(window.location.search).get("view") === "1";
const stateApiUrl = viewOnly ? "/api/futsal-state?view=1" : "/api/futsal-state";
const teamNamesApiUrl = viewOnly ? "/api/futsal-team-names?view=1" : "/api/futsal-team-names";

const CATEGORY_CONFIG = [
  { name: "Cabang", groups: "Grup A & B", color: "#0c4f9e", slotGroups: ["A", "B"] },
  { name: "Outsourcing", groups: "Grup C", color: "#7b55a3", slotGroups: ["C"] },
  { name: "Kantor Pusat", groups: "Grup D", color: "#bd6736", slotGroups: ["D"] },
];

const DEFAULT_MASTER_TEAMS = [
  { id: "cabang-01", name: "Palembang", category: "Cabang" },
  { id: "cabang-02", name: "Balikpapan", category: "Cabang" },
  { id: "cabang-03", name: "JATSC 1", category: "Cabang" },
  { id: "cabang-04", name: "Denpasar", category: "Cabang" },
  { id: "cabang-05", name: "Yogyakarta", category: "Cabang" },
  { id: "cabang-06", name: "JATSC 2", category: "Cabang" },
  { id: "cabang-07", name: "Banjarmasin", category: "Cabang" },
  { id: "cabang-08", name: "MATSC", category: "Cabang" },
  { id: "outsourcing-01", name: "UGM 1", category: "Outsourcing" },
  { id: "outsourcing-02", name: "UGM 2", category: "Outsourcing" },
  { id: "outsourcing-03", name: "AVSEC JATSC", category: "Outsourcing" },
  { id: "kantor-pusat-01", name: "Direktorat Operasi", category: "Kantor Pusat" },
  { id: "kantor-pusat-02", name: "Direktorat Teknik", category: "Kantor Pusat" },
  { id: "kantor-pusat-03", name: "Direktorat SDM", category: "Kantor Pusat" },
  { id: "kantor-pusat-04", name: "Direktorat Keuangan", category: "Kantor Pusat" },
  { id: "kantor-pusat-05", name: "DKKS", category: "Kantor Pusat" },
];

const GROUPS = [
  {
    id: "A",
    color: "#0c4f9e",
    category: "Cabang",
    slots: [
      ["A1", "Cabang 1"],
      ["A2", "Cabang 2"],
      ["A3", "Cabang 3"],
      ["A4", "Cabang 4"],
    ],
  },
  {
    id: "B",
    color: "#138566",
    category: "Cabang",
    slots: [
      ["B1", "Cabang 5"],
      ["B2", "Cabang 6"],
      ["B3", "Cabang 7"],
      ["B4", "Cabang 8"],
    ],
  },
  {
    id: "C",
    color: "#7b55a3",
    category: "Outsourcing",
    slots: [
      ["C1", "UG Mandiri 1"],
      ["C2", "UG Mandiri 2"],
      ["C3", "AVSEC JATSC"],
    ],
  },
  {
    id: "D",
    color: "#bd6736",
    category: "Kantor Pusat",
    slots: [
      ["D1", "Dit. SDM dan Umum"],
      ["D2", "Dit. Keuangan dan Manajemen Risiko"],
      ["D3", "Dit. Teknik"],
      ["D4", "Dit. Keselamatan, Keamanan dan Standarisasi"],
      ["D5", "Dit. Operasi"],
    ],
  },
];

const TEAM_SLOTS = GROUPS.flatMap((group) =>
  group.slots.map(([id]) => ({ id, group: group.id, category: group.category })),
);
const SLOT_BY_ID = Object.fromEntries(TEAM_SLOTS.map((slot) => [slot.id, slot]));
const GROUP_MATCHES = GROUPS.flatMap((group) => createRoundRobin(group));
const GROUP_MATCH_BY_ID = Object.fromEntries(GROUP_MATCHES.map((match) => [match.id, match]));

const KNOCKOUT_DEFS = [
  { id: "QF1", stage: "8 Besar", sourceHome: ["rank", "A", 0], sourceAway: ["rank", "B", 1] },
  { id: "QF2", stage: "8 Besar", sourceHome: ["rank", "B", 0], sourceAway: ["rank", "A", 1] },
  { id: "QF3", stage: "8 Besar", sourceHome: ["rank", "C", 0], sourceAway: ["rank", "D", 1] },
  { id: "QF4", stage: "8 Besar", sourceHome: ["rank", "D", 0], sourceAway: ["rank", "C", 1] },
  { id: "SF1", stage: "Semifinal", sourceHome: ["winner", "QF1"], sourceAway: ["winner", "QF2"] },
  { id: "SF2", stage: "Semifinal", sourceHome: ["winner", "QF3"], sourceAway: ["winner", "QF4"] },
  { id: "THIRD", stage: "Perebutan Juara 3", sourceHome: ["loser", "SF1"], sourceAway: ["loser", "SF2"] },
  { id: "FINAL", stage: "Final", sourceHome: ["winner", "SF1"], sourceAway: ["winner", "SF2"] },
];

const GROUP_DAY_BUNDLES = [
  [["A", 0], ["B", 0], ["C", 0], ["D", 0], ["D", 1]],
  [["A", 1], ["B", 1], ["C", 1], ["D", 2], ["D", 3]],
  [["A", 2], ["B", 2], ["C", 2], ["D", 4]],
];

const DAY_DEFS = [
  { date: "Senin, 07 September 2026", label: "Penyisihan hari I", times: ["07:30", "08:00", "08:30", "09:00", "16:00", "16:30", "17:00", "17:30", "18:00"] },
  { date: "Selasa, 08 September 2026", label: "Penyisihan hari II", times: ["07:30", "08:00", "08:30", "09:00", "16:00", "16:30", "17:00", "17:30", "18:00"] },
  { date: "Rabu, 09 September 2026", label: "Penyisihan hari III", times: ["07:30", "08:00", "08:30", "09:00", "16:00", "16:30", "17:00"] },
];

const DEFAULT_STATE = {
  title: "Turnamen Futsal AirNav 2026",
  mapping: Object.fromEntries(TEAM_SLOTS.map((slot) => [slot.id, null])),
  mappingLocked: false,
  groupResults: {},
  knockoutResults: {},
};

const els = {
  title: document.getElementById("tournamentTitle"),
  saveState: document.getElementById("saveState"),
  completedStat: document.getElementById("completedStat"),
  openViewOnly: document.getElementById("openViewOnly"),
  groupMatches: document.getElementById("groupMatches"),
  standingsGrid: document.getElementById("standingsGrid"),
  knockoutBracket: document.getElementById("knockoutBracket"),
  podium: document.getElementById("podium"),
  scheduleDays: document.getElementById("scheduleDays"),
  recapTeamList: document.getElementById("recapTeamList"),
  recapContent: document.getElementById("recapContent"),
  mappingGrid: document.getElementById("mappingGrid"),
  mappingMeta: document.getElementById("mappingMeta"),
  randomizeMapping: document.getElementById("randomizeMapping"),
  resetMapping: document.getElementById("resetMapping"),
  mappingLock: document.getElementById("toggleMappingLock"),
  dialog: document.getElementById("matchDialog"),
  dialogMeta: document.getElementById("dialogMeta"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogBody: document.getElementById("dialogBody"),
  clearMatch: document.getElementById("clearMatch"),
};

let state = structuredClone(DEFAULT_STATE);
let masterTeams = structuredClone(DEFAULT_MASTER_TEAMS);
let saveQueue = Promise.resolve();
let teamNamesSaveQueue = Promise.resolve();
let activeDialogMatchId = null;
let activeDialogType = null;
let selectedRecapSlot = "A1";

initialize();

async function initialize() {
  if (viewOnly) document.body.classList.add("view-only");
  masterTeams = await loadMasterTeams();
  state = await loadState();
  els.title.value = state.title;

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  els.title.addEventListener("input", (event) => {
    state.title = event.target.value;
    persist();
  });

  els.openViewOnly.addEventListener("click", () => {
    window.open(`${window.location.origin}/futsal?view=1`, "_blank");
  });

  els.randomizeMapping.addEventListener("click", () => {
    if (state.mappingLocked) return;
    if (!prepareForMappingChange("Pengacakan ulang")) return;
    state.mapping = createRandomMapping();
    persist();
    renderAll();
  });

  els.resetMapping.addEventListener("click", () => {
    if (state.mappingLocked) return;
    const hasResults = Object.keys(state.groupResults).length > 0 || Object.keys(state.knockoutResults).length > 0;
    const message = hasResults
      ? "Reset mapping akan menghapus seluruh skor dan kartu pertandingan. Lanjutkan?"
      : "Kosongkan seluruh hasil mapping tim?";
    if (!window.confirm(message)) return;
    if (hasResults) {
      state.groupResults = {};
      state.knockoutResults = {};
    }
    state.mapping = structuredClone(DEFAULT_STATE.mapping);
    persist();
    renderAll();
  });

  els.mappingLock.addEventListener("click", () => {
    if (state.mappingLocked) {
      state.mappingLocked = false;
    } else {
      if (!isMappingComplete()) {
        if (!prepareForMappingChange("Pengacakan otomatis")) return;
        state.mapping = createRandomMapping();
      }
      state.mappingLocked = true;
    }
    persist();
    renderAll();
  });

  els.clearMatch.addEventListener("click", clearActiveMatch);
  renderAll();
}

function createRoundRobin(group) {
  const participants = group.slots.map(([id]) => id);
  if (participants.length % 2) participants.push(null);
  const rotating = [...participants];
  const matches = [];
  let matchNumber = 1;

  for (let round = 0; round < rotating.length - 1; round += 1) {
    for (let index = 0; index < rotating.length / 2; index += 1) {
      const first = rotating[index];
      const second = rotating[rotating.length - 1 - index];
      if (!first || !second) continue;
      const reverse = round % 2 === 1;
      matches.push({
        id: `G${group.id}${String(matchNumber).padStart(2, "0")}`,
        group: group.id,
        round,
        home: reverse ? second : first,
        away: reverse ? first : second,
      });
      matchNumber += 1;
    }
    rotating.splice(1, 0, rotating.pop());
  }

  return matches;
}

async function loadState() {
  try {
    const response = await fetch(stateApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Data futsal tidak dapat dimuat");
    const payload = await response.json();
    return normalizeState(payload);
  } catch (error) {
    setSaveIndicator(error.message, "error");
    return structuredClone(DEFAULT_STATE);
  }
}

async function loadMasterTeams() {
  try {
    const response = await fetch(teamNamesApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Master tim futsal tidak dapat dimuat");
    const payload = await response.json();
    return normalizeMasterTeams(payload);
  } catch (error) {
    setSaveIndicator(error.message, "error");
    return structuredClone(DEFAULT_MASTER_TEAMS);
  }
}

function normalizeMasterTeams(input) {
  if (!Array.isArray(input)) return structuredClone(DEFAULT_MASTER_TEAMS);
  const byId = Object.fromEntries(input.map((team) => [team?.id, team]));
  return DEFAULT_MASTER_TEAMS.map((fallback) => {
    const stored = byId[fallback.id];
    return {
      id: fallback.id,
      category: fallback.category,
      name: typeof stored?.name === "string" ? stored.name : fallback.name,
    };
  });
}

function normalizeState(input) {
  const safe = input && typeof input === "object" ? input : {};
  const mapping = { ...DEFAULT_STATE.mapping };
  const usedTeamIds = new Set();
  Object.keys(mapping).forEach((slotId) => {
    const storedValue = safe.mapping?.[slotId];
    const matchedTeam = masterTeams.find((team) =>
      team.id === storedValue || (typeof storedValue === "string" && storedValue && team.name === storedValue),
    );
    if (!matchedTeam || usedTeamIds.has(matchedTeam.id) || !isTeamAllowedInSlot(matchedTeam, slotId)) return;
    mapping[slotId] = matchedTeam.id;
    usedTeamIds.add(matchedTeam.id);
  });
  return {
    title: typeof safe.title === "string" && safe.title.trim() ? safe.title : DEFAULT_STATE.title,
    mapping,
    mappingLocked: Boolean(safe.mappingLocked),
    groupResults: normalizeResults(safe.groupResults, GROUP_MATCHES.map((match) => match.id), true),
    knockoutResults: normalizeResults(safe.knockoutResults, KNOCKOUT_DEFS.map((match) => match.id), false),
  };
}

function isTeamAllowedInSlot(team, slotId) {
  return Boolean(team && SLOT_BY_ID[slotId]?.category === team.category);
}

function normalizeResults(source, allowedIds, includeCards) {
  const results = {};
  allowedIds.forEach((id) => {
    const item = source?.[id];
    if (!item || typeof item !== "object") return;
    results[id] = {
      home: normalizeValue(item.home),
      away: normalizeValue(item.away),
      notes: [normalizeMatchNotes(item.notes?.[0]), normalizeMatchNotes(item.notes?.[1])],
    };
    if (includeCards) {
      results[id].cards = [normalizeCards(item.cards?.[0]), normalizeCards(item.cards?.[1])];
    } else {
      results[id].penHome = normalizeValue(item.penHome);
      results[id].penAway = normalizeValue(item.penAway);
    }
  });
  return results;
}

function normalizeMatchNotes(notes) {
  return {
    scorers: typeof notes?.scorers === "string" ? notes.scorers : "",
    cards: typeof notes?.cards === "string" ? notes.cards : "",
  };
}

function normalizeCards(cards) {
  return {
    yellow: normalizeValue(cards?.yellow),
    secondYellow: normalizeValue(cards?.secondYellow),
    red: normalizeValue(cards?.red),
  };
}

function normalizeValue(value) {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? String(Math.floor(parsed)) : "";
}

function persist() {
  if (viewOnly) return Promise.resolve();
  const snapshot = structuredClone(state);
  setSaveIndicator("Menyimpan…", "saving");
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => fetch(stateApiUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    }))
    .then((response) => {
      if (!response.ok) throw new Error("Data futsal gagal disimpan");
      setSaveIndicator("Data tersimpan", "");
    })
    .catch((error) => setSaveIndicator(error.message, "error"));
  return saveQueue;
}

function persistMasterTeams() {
  if (viewOnly) return Promise.resolve();
  const snapshot = structuredClone(masterTeams);
  setSaveIndicator("Menyimpan master tim…", "saving");
  teamNamesSaveQueue = teamNamesSaveQueue
    .catch(() => {})
    .then(() => fetch(teamNamesApiUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    }))
    .then((response) => {
      if (!response.ok) throw new Error("Master tim futsal gagal disimpan");
      setSaveIndicator("Data tersimpan", "");
    })
    .catch((error) => setSaveIndicator(error.message, "error"));
  return teamNamesSaveQueue;
}

function setSaveIndicator(message, className) {
  els.saveState.textContent = message;
  els.saveState.className = `save-state${className ? ` ${className}` : ""}`;
}

function setView(view) {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== view;
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

function renderAll() {
  const standings = calculateAllStandings();
  const knockout = buildKnockout(standings);
  renderGroupMatches();
  renderStandings(standings);
  renderKnockout(knockout);
  renderSchedule(knockout);
  renderTeamRecap(knockout);
  renderMapping();
  const completedGroups = GROUP_MATCHES.filter((match) => isGroupMatchComplete(match.id)).length;
  const completedKnockout = knockout.filter((match) => Boolean(match.winner)).length;
  els.completedStat.textContent = `${completedGroups + completedKnockout}/33`;
}

function displayName(slotId) {
  if (!slotId) return "";
  const mapped = mappedTeamForSlot(slotId);
  return mapped?.name?.trim() ? `${slotId} · ${mapped.name.trim()}` : slotId;
}

function mappedTeamForSlot(slotId) {
  const teamId = state.mapping[slotId];
  return masterTeams.find((team) => team.id === teamId) || null;
}

function isGroupMatchComplete(matchId) {
  const result = state.groupResults[matchId];
  return result && result.home !== "" && result.away !== "";
}

function renderGroupMatches() {
  els.groupMatches.replaceChildren();
  GROUPS.forEach((group) => {
    const block = document.createElement("article");
    block.className = "group-block";
    block.style.setProperty("--group-color", group.color);

    const head = document.createElement("div");
    head.className = "group-block-head";
    const title = document.createElement("h3");
    title.textContent = `Grup ${group.id}`;
    const meta = document.createElement("span");
    const matches = GROUP_MATCHES.filter((match) => match.group === group.id);
    meta.textContent = `${matches.length} pertandingan`;
    head.append(title, meta);
    block.append(head);

    matches.forEach((match) => block.append(renderGroupMatchRow(match)));
    els.groupMatches.append(block);
  });
}

function renderGroupMatchRow(match) {
  const result = state.groupResults[match.id] || emptyGroupResult();
  const row = document.createElement("div");
  row.className = `match-row${isGroupMatchComplete(match.id) ? " complete" : ""}`;

  const home = document.createElement("span");
  home.className = "match-team";
  home.title = displayName(match.home);
  home.textContent = displayName(match.home);
  const away = document.createElement("span");
  away.className = "match-team away";
  away.title = displayName(match.away);
  away.textContent = displayName(match.away);

  const homeScore = createScoreInput(result.home, `${displayName(match.home)} skor`, (value) => setGroupScore(match.id, "home", value));
  const awayScore = createScoreInput(result.away, `${displayName(match.away)} skor`, (value) => setGroupScore(match.id, "away", value));
  const divider = document.createElement("span");
  divider.className = "score-divider";
  divider.textContent = "—";
  const detail = document.createElement("button");
  detail.type = "button";
  detail.className = `match-detail-button${hasMatchRecords(result) ? " has-cards" : ""}`;
  detail.textContent = "✎";
  detail.title = "Catatan gol dan kartu";
  detail.addEventListener("click", () => openMatchDialog(match.id));

  row.append(home, homeScore, divider, awayScore, away, detail);
  return row;
}

function createScoreInput(value, label, onChange) {
  const input = document.createElement("input");
  input.className = "score-box";
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.inputMode = "numeric";
  input.placeholder = "–";
  input.value = value;
  input.disabled = viewOnly;
  input.setAttribute("aria-label", label);
  input.addEventListener("change", (event) => onChange(normalizeValue(event.target.value)));
  return input;
}

function emptyGroupResult() {
  return {
    home: "",
    away: "",
    cards: [normalizeCards(), normalizeCards()],
    notes: [normalizeMatchNotes(), normalizeMatchNotes()],
  };
}

function setGroupScore(matchId, side, value) {
  state.groupResults[matchId] ||= emptyGroupResult();
  state.groupResults[matchId][side] = value;
  state.knockoutResults = {};
  persist();
  renderAll();
}

function countMatchCards(result) {
  return (result.cards || []).reduce((sum, cards) =>
    sum + Number(cards?.yellow || 0) + Number(cards?.secondYellow || 0) + Number(cards?.red || 0), 0);
}

function hasMatchRecords(result) {
  return countMatchCards(result) > 0 || (result.notes || []).some((notes) => notes?.scorers?.trim() || notes?.cards?.trim());
}

function openMatchDialog(matchId) {
  const match = GROUP_MATCH_BY_ID[matchId];
  if (!match) return;
  activeDialogType = "group";
  activeDialogMatchId = matchId;
  state.groupResults[matchId] ||= emptyGroupResult();
  const result = state.groupResults[matchId];
  result.cards ||= [normalizeCards(), normalizeCards()];
  result.notes ||= [normalizeMatchNotes(), normalizeMatchNotes()];
  els.dialogMeta.textContent = `${match.id} · Grup ${match.group}`;
  els.dialogTitle.textContent = `${displayName(match.home)} vs ${displayName(match.away)}`;
  els.dialogBody.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "cards-grid";
  [match.home, match.away].forEach((slotId, teamIndex) => {
    const panel = document.createElement("section");
    panel.className = "team-cards";
    const heading = document.createElement("h3");
    heading.textContent = displayName(slotId);
    panel.append(heading);
    panel.append(renderNarrativeFields(result, teamIndex));

    const cardCounts = document.createElement("div");
    cardCounts.className = "card-counts";
    const cardCountsTitle = document.createElement("p");
    cardCountsTitle.textContent = "Jumlah kartu untuk tie-breaker grup";
    cardCounts.append(cardCountsTitle);
    [
      ["yellow", "Kartu kuning biasa"],
      ["secondYellow", "Merah dari dua kuning"],
      ["red", "Merah langsung"],
    ].forEach(([key, label]) => {
      const field = document.createElement("label");
      field.className = "card-field";
      const text = document.createElement("span");
      text.textContent = label;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.value = result.cards[teamIndex]?.[key] ?? "";
      input.disabled = viewOnly;
      input.addEventListener("change", (event) => {
        result.cards[teamIndex][key] = normalizeValue(event.target.value);
        state.knockoutResults = {};
        persist();
        renderAll();
      });
      field.append(text, input);
      cardCounts.append(field);
    });
    panel.append(cardCounts);
    grid.append(panel);
  });
  els.dialogBody.append(grid);
  els.dialog.showModal();
}

function renderNarrativeFields(result, teamIndex) {
  result.notes ||= [normalizeMatchNotes(), normalizeMatchNotes()];
  result.notes[teamIndex] ||= normalizeMatchNotes();
  const fields = document.createElement("div");
  fields.className = "narrative-fields";
  [
    ["scorers", "Pencetak gol", "Contoh: Rizky #10 — menit 08, 21"],
    ["cards", "Penerima kartu", "Contoh: Andi #4 — kuning menit 15"],
  ].forEach(([key, label, placeholder]) => {
    const field = document.createElement("label");
    field.className = "narrative-field";
    const text = document.createElement("span");
    text.textContent = label;
    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.value = result.notes[teamIndex][key] || "";
    textarea.placeholder = placeholder;
    textarea.disabled = viewOnly;
    textarea.addEventListener("change", (event) => {
      result.notes[teamIndex][key] = event.target.value.trim();
      persist();
      renderAll();
    });
    field.append(text, textarea);
    fields.append(field);
  });
  return fields;
}

function clearActiveMatch() {
  if (!activeDialogMatchId || !activeDialogType) return;
  if (activeDialogType === "group") {
    delete state.groupResults[activeDialogMatchId];
    state.knockoutResults = {};
  } else {
    delete state.knockoutResults[activeDialogMatchId];
    clearInvalidDownstreamResults(activeDialogMatchId);
  }
  persist();
  els.dialog.close();
  activeDialogMatchId = null;
  activeDialogType = null;
  renderAll();
}

function calculateAllStandings() {
  return Object.fromEntries(GROUPS.map((group) => [group.id, calculateStandings(group)]));
}

function calculateStandings(group) {
  const rows = group.slots.map(([id], originalIndex) => ({
    id, originalIndex, played: 0, wins: 0, draws: 0, losses: 0,
    gf: 0, ga: 0, gd: 0, points: 0, fairPlay: 0, h2h: 0,
  }));
  const rowById = Object.fromEntries(rows.map((row) => [row.id, row]));
  const completed = GROUP_MATCHES.filter((match) => match.group === group.id && isGroupMatchComplete(match.id));

  completed.forEach((match) => {
    const result = state.groupResults[match.id];
    const homeGoals = Number(result.home);
    const awayGoals = Number(result.away);
    const home = rowById[match.home];
    const away = rowById[match.away];
    home.played += 1; away.played += 1;
    home.gf += homeGoals; home.ga += awayGoals;
    away.gf += awayGoals; away.ga += homeGoals;
    if (homeGoals > awayGoals) {
      home.wins += 1; home.points += 3; away.losses += 1;
    } else if (homeGoals < awayGoals) {
      away.wins += 1; away.points += 3; home.losses += 1;
    } else {
      home.draws += 1; away.draws += 1; home.points += 1; away.points += 1;
    }
    home.fairPlay += fairPlayScore(result.cards?.[0]);
    away.fairPlay += fairPlayScore(result.cards?.[1]);
  });

  rows.forEach((row) => { row.gd = row.gf - row.ga; });
  const baseBuckets = new Map();
  rows.forEach((row) => {
    const key = `${row.points}|${row.gd}|${row.gf}`;
    if (!baseBuckets.has(key)) baseBuckets.set(key, []);
    baseBuckets.get(key).push(row.id);
  });
  baseBuckets.forEach((tiedIds) => {
    if (tiedIds.length < 2) return;
    const tiedSet = new Set(tiedIds);
    completed.forEach((match) => {
      if (!tiedSet.has(match.home) || !tiedSet.has(match.away)) return;
      const result = state.groupResults[match.id];
      const homeGoals = Number(result.home);
      const awayGoals = Number(result.away);
      if (homeGoals > awayGoals) rowById[match.home].h2h += 3;
      else if (homeGoals < awayGoals) rowById[match.away].h2h += 3;
      else { rowById[match.home].h2h += 1; rowById[match.away].h2h += 1; }
    });
  });

  return rows.sort((a, b) =>
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    b.h2h - a.h2h ||
    b.fairPlay - a.fairPlay ||
    a.originalIndex - b.originalIndex,
  );
}

function fairPlayScore(cards) {
  return -Number(cards?.yellow || 0) - (3 * Number(cards?.secondYellow || 0)) - (4 * Number(cards?.red || 0));
}

function renderStandings(standings) {
  els.standingsGrid.replaceChildren();
  GROUPS.forEach((group) => {
    const card = document.createElement("article");
    card.className = "standing-card";
    card.style.setProperty("--group-color", group.color);
    const heading = document.createElement("h3");
    heading.textContent = `Grup ${group.id}`;
    const scroll = document.createElement("div");
    scroll.className = "table-scroll";
    const table = document.createElement("table");
    table.className = "standings-table";
    table.innerHTML = "<thead><tr><th>#</th><th>Tim</th><th>M</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>FP</th><th>PTS</th></tr></thead>";
    const body = document.createElement("tbody");
    standings[group.id].forEach((row, index) => {
      const tr = document.createElement("tr");
      if (index < 2) tr.className = "qualified";
      const values = [index + 1, null, row.played, row.wins, row.draws, row.losses, row.gf, row.ga, signed(row.gd), row.fairPlay, row.points];
      values.forEach((value, cellIndex) => {
        const td = document.createElement("td");
        if (cellIndex === 0) td.className = "rank-number";
        if (cellIndex === 1) {
          td.className = "team-cell";
          td.textContent = displayName(row.id);
          const slot = document.createElement("span");
          slot.className = "team-slot";
          slot.textContent = SLOT_BY_ID[row.id].category;
          td.append(slot);
        } else {
          td.textContent = String(value);
        }
        if (cellIndex === 9) td.classList.add("fair-score");
        tr.append(td);
      });
      body.append(tr);
    });
    table.append(body);
    scroll.append(table);
    card.append(heading, scroll);
    els.standingsGrid.append(card);
  });
}

function signed(number) {
  return number > 0 ? `+${number}` : String(number);
}

function buildKnockout(standings) {
  const built = [];
  const byId = {};
  KNOCKOUT_DEFS.forEach((definition) => {
    const home = resolveSource(definition.sourceHome, standings, byId);
    const away = resolveSource(definition.sourceAway, standings, byId);
    const result = state.knockoutResults[definition.id] || emptyKnockoutResult();
    const resolution = resolveKnockoutResult(home, away, result);
    const match = { ...definition, home, away, result, ...resolution };
    built.push(match);
    byId[match.id] = match;
  });
  return built;
}

function emptyKnockoutResult() {
  return {
    home: "",
    away: "",
    penHome: "",
    penAway: "",
    notes: [normalizeMatchNotes(), normalizeMatchNotes()],
  };
}

function resolveSource(source, standings, matches) {
  if (source[0] === "rank") {
    const groupFinished = GROUP_MATCHES
      .filter((match) => match.group === source[1])
      .every((match) => isGroupMatchComplete(match.id));
    if (!groupFinished) return null;
    const row = standings[source[1]]?.[source[2]];
    return row ? row.id : null;
  }
  const match = matches[source[1]];
  return source[0] === "winner" ? match?.winner || null : match?.loser || null;
}

function resolveKnockoutResult(home, away, result) {
  if (!home || !away || result.home === "" || result.away === "") return { winner: null, loser: null, decidedByPenalties: false };
  const homeScore = Number(result.home);
  const awayScore = Number(result.away);
  if (homeScore > awayScore) return { winner: home, loser: away, decidedByPenalties: false };
  if (awayScore > homeScore) return { winner: away, loser: home, decidedByPenalties: false };
  if (result.penHome === "" || result.penAway === "") return { winner: null, loser: null, decidedByPenalties: false };
  const penHome = Number(result.penHome);
  const penAway = Number(result.penAway);
  if (penHome === penAway) return { winner: null, loser: null, decidedByPenalties: false };
  return penHome > penAway
    ? { winner: home, loser: away, decidedByPenalties: true }
    : { winner: away, loser: home, decidedByPenalties: true };
}

function renderKnockout(matches) {
  els.knockoutBracket.replaceChildren();
  const rounds = [
    { className: "quarterfinal", code: "R01", label: "8 Besar", ids: ["QF1", "QF2", "QF3", "QF4"] },
    { className: "semifinal", code: "R02", label: "Semifinal", ids: ["SF1", "SF2"] },
    { className: "finals", code: "R03", label: "Finals", ids: ["FINAL", "THIRD"] },
  ];
  rounds.forEach((round) => {
    const section = document.createElement("section");
    section.className = `knockout-round ${round.className}`;
    const label = document.createElement("div");
    label.className = "round-label";
    label.innerHTML = `<span>${round.code}</span>${round.label}`;
    const host = document.createElement("div");
    host.className = "knockout-matches";
    round.ids.forEach((id) => host.append(renderKnockoutMatch(matches.find((match) => match.id === id))));
    section.append(label, host);
    els.knockoutBracket.append(section);
  });
  renderPodium(matches);
}

function renderKnockoutMatch(match) {
  const card = document.createElement("article");
  card.className = "ko-match";
  const head = document.createElement("div");
  head.className = "ko-match-head";
  const title = document.createElement("span");
  title.textContent = match.stage;
  const code = document.createElement("span");
  code.textContent = match.id;
  const headActions = document.createElement("div");
  headActions.className = "ko-head-actions";
  const notesButton = document.createElement("button");
  notesButton.type = "button";
  notesButton.className = `ko-notes-button${hasMatchRecords(match.result) ? " has-notes" : ""}`;
  notesButton.textContent = "Catatan";
  notesButton.disabled = !match.home || !match.away;
  notesButton.addEventListener("click", () => openKnockoutMatchDialog(match));
  headActions.append(code, notesButton);
  head.append(title, headActions);
  card.append(head);
  card.append(createKnockoutSlot(match, "home"), createKnockoutSlot(match, "away"));

  const tied = match.result.home !== "" && match.result.away !== "" && Number(match.result.home) === Number(match.result.away);
  if (tied) {
    const row = document.createElement("div");
    row.className = "penalty-row";
    const label = document.createElement("span");
    label.textContent = "Adu penalti";
    const inputs = document.createElement("div");
    inputs.className = "penalty-inputs";
    const home = createPenaltyInput(match, "penHome");
    const divider = document.createElement("span");
    divider.textContent = "—";
    const away = createPenaltyInput(match, "penAway");
    inputs.append(home, divider, away);
    row.append(label, inputs);
    card.append(row);
  }
  return card;
}

function createKnockoutSlot(match, side) {
  const slotId = match[side];
  const row = document.createElement("div");
  row.className = "ko-slot";
  const team = document.createElement("span");
  team.className = `ko-team${match.winner === slotId ? " winner" : ""}`;
  team.textContent = slotId ? displayName(slotId) : sourcePlaceholder(side === "home" ? match.sourceHome : match.sourceAway);
  const input = createScoreInput(match.result[side], `${match.id} skor ${side}`, (value) => setKnockoutScore(match.id, side, value));
  input.disabled = viewOnly || !slotId;
  row.append(team, input);
  return row;
}

function sourcePlaceholder(source) {
  if (source[0] === "rank") return `Peringkat ${source[2] + 1} Grup ${source[1]}`;
  return `${source[0] === "winner" ? "Pemenang" : "Kalah"} ${source[1]}`;
}

function createPenaltyInput(match, key) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = match.result[key] ?? "";
  input.disabled = viewOnly;
  input.setAttribute("aria-label", `${match.id} ${key === "penHome" ? "penalti home" : "penalti away"}`);
  input.addEventListener("change", (event) => setKnockoutScore(match.id, key, normalizeValue(event.target.value)));
  return input;
}

function setKnockoutScore(matchId, field, value) {
  state.knockoutResults[matchId] ||= emptyKnockoutResult();
  state.knockoutResults[matchId][field] = value;
  if ((field === "home" || field === "away") && state.knockoutResults[matchId].home !== state.knockoutResults[matchId].away) {
    state.knockoutResults[matchId].penHome = "";
    state.knockoutResults[matchId].penAway = "";
  }
  clearInvalidDownstreamResults(matchId);
  persist();
  renderAll();
}

function openKnockoutMatchDialog(match) {
  if (!match?.home || !match?.away) return;
  activeDialogType = "knockout";
  activeDialogMatchId = match.id;
  state.knockoutResults[match.id] ||= emptyKnockoutResult();
  const result = state.knockoutResults[match.id];
  result.notes ||= [normalizeMatchNotes(), normalizeMatchNotes()];
  els.dialogMeta.textContent = `${match.id} · ${match.stage}`;
  els.dialogTitle.textContent = `${displayName(match.home)} vs ${displayName(match.away)}`;
  els.dialogBody.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "cards-grid";
  [match.home, match.away].forEach((slotId, teamIndex) => {
    const panel = document.createElement("section");
    panel.className = "team-cards";
    const heading = document.createElement("h3");
    heading.textContent = displayName(slotId);
    panel.append(heading, renderNarrativeFields(result, teamIndex));
    grid.append(panel);
  });
  els.dialogBody.append(grid);
  els.dialog.showModal();
}

function clearInvalidDownstreamResults(changedId) {
  const downstream = {
    QF1: ["SF1", "FINAL", "THIRD"], QF2: ["SF1", "FINAL", "THIRD"],
    QF3: ["SF2", "FINAL", "THIRD"], QF4: ["SF2", "FINAL", "THIRD"],
    SF1: ["FINAL", "THIRD"], SF2: ["FINAL", "THIRD"],
  };
  (downstream[changedId] || []).forEach((id) => { delete state.knockoutResults[id]; });
}

function renderPodium(matches) {
  els.podium.replaceChildren();
  const final = matches.find((match) => match.id === "FINAL");
  const third = matches.find((match) => match.id === "THIRD");
  [
    ["Juara 1", final?.winner, "champion"],
    ["Juara 2", final?.loser, "runner-up"],
    ["Juara 3", third?.winner, "third"],
  ].forEach(([label, slotId, className]) => {
    const card = document.createElement("article");
    card.className = `podium-card ${className}`;
    const rank = document.createElement("span");
    rank.textContent = label;
    const name = document.createElement("strong");
    name.textContent = slotId ? displayName(slotId) : "Menunggu hasil";
    card.append(rank, name);
    els.podium.append(card);
  });
}

function renderSchedule(knockout) {
  els.scheduleDays.replaceChildren();
  DAY_DEFS.forEach((day, dayIndex) => {
    const selected = GROUP_DAY_BUNDLES[dayIndex].flatMap(([groupId, round]) =>
      GROUP_MATCHES.filter((match) => match.group === groupId && match.round === round),
    );
    const ordered = orderDayMatches(selected);
    renderScheduleDay(day.date, day.label, ordered.map((match, index) => ({
      id: match.id,
      time: day.times[index],
      home: displayName(match.home),
      away: displayName(match.away),
      stage: `Grup ${match.group}`,
      sessionBreak: index > 0 && day.times[index - 1] < "12:00" && day.times[index] >= "12:00",
    })));
  });

  const knockoutById = Object.fromEntries(knockout.map((match) => [match.id, match]));
  renderScheduleDay("Kamis, 10 September 2026", "8 besar & semifinal", [
    scheduleKnockout("QF1", "07:30", knockoutById),
    scheduleKnockout("QF2", "08:00", knockoutById),
    scheduleKnockout("QF3", "08:30", knockoutById),
    scheduleKnockout("QF4", "09:00", knockoutById),
    { breakLabel: "Istirahat dan persiapan semifinal" },
    scheduleKnockout("SF1", "16:00", knockoutById),
    scheduleKnockout("SF2", "17:00", knockoutById),
  ]);
  renderScheduleDay("Jumat, 11 September 2026", "Perebutan juara 3 & final", [
    scheduleKnockout("THIRD", "16:00", knockoutById),
    scheduleKnockout("FINAL", "17:00", knockoutById),
  ]);
}

function orderDayMatches(matches) {
  const remaining = [...matches];
  const ordered = [];
  while (remaining.length) {
    const recent = ordered.slice(-2).flatMap((match) => [match.home, match.away]);
    let index = remaining.findIndex((match) => !recent.includes(match.home) && !recent.includes(match.away));
    if (index < 0) {
      const last = ordered.at(-1);
      index = remaining.findIndex((match) => !last || ![last.home, last.away].includes(match.home) && ![last.home, last.away].includes(match.away));
    }
    if (index < 0) index = 0;
    ordered.push(remaining.splice(index, 1)[0]);
  }
  return ordered;
}

function scheduleKnockout(id, time, byId) {
  const match = byId[id];
  return {
    id,
    time,
    home: match?.home ? displayName(match.home) : sourcePlaceholder(match?.sourceHome || ["winner", "TBD"]),
    away: match?.away ? displayName(match.away) : sourcePlaceholder(match?.sourceAway || ["winner", "TBD"]),
    stage: match?.stage || id,
  };
}

function renderScheduleDay(date, label, entries) {
  const section = document.createElement("article");
  section.className = "schedule-day";
  const head = document.createElement("div");
  head.className = "schedule-day-head";
  const title = document.createElement("h3");
  title.textContent = date;
  const meta = document.createElement("span");
  meta.textContent = label;
  head.append(title, meta);

  const table = document.createElement("table");
  table.className = "schedule-table";
  table.innerHTML = "<thead><tr><th>Match</th><th>Waktu</th><th>Pertandingan</th></tr></thead>";
  const body = document.createElement("tbody");
  entries.forEach((entry) => {
    if (entry.breakLabel) {
      const row = document.createElement("tr");
      row.className = "break-row";
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.textContent = entry.breakLabel;
      row.append(cell);
      body.append(row);
      return;
    }
    if (entry.sessionBreak) {
      const breakRow = document.createElement("tr");
      breakRow.className = "break-row";
      const breakCell = document.createElement("td");
      breakCell.colSpan = 3;
      breakCell.textContent = "Jeda sesi pagi — sore";
      breakRow.append(breakCell);
      body.append(breakRow);
    }
    const row = document.createElement("tr");
    const id = document.createElement("td"); id.textContent = entry.id;
    const time = document.createElement("td"); time.textContent = `${entry.time} WIB`;
    const fixture = document.createElement("td");
    fixture.append(document.createTextNode(entry.home));
    const versus = document.createElement("span"); versus.className = "schedule-versus"; versus.textContent = "VS";
    fixture.append(versus, document.createTextNode(entry.away));
    const stage = document.createElement("span"); stage.className = "schedule-stage"; stage.textContent = entry.stage;
    fixture.append(stage);
    row.append(id, time, fixture);
    body.append(row);
  });
  table.append(body);
  section.append(head, table);
  els.scheduleDays.append(section);
}

function renderTeamRecap(knockout) {
  els.recapTeamList.replaceChildren();
  if (!SLOT_BY_ID[selectedRecapSlot]) selectedRecapSlot = "A1";

  GROUPS.forEach((group) => {
    const groupLabel = document.createElement("p");
    groupLabel.className = "recap-group-label";
    groupLabel.textContent = `Grup ${group.id}`;
    els.recapTeamList.append(groupLabel);
    group.slots.forEach(([slotId]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `recap-team-button${selectedRecapSlot === slotId ? " active" : ""}`;
      const code = document.createElement("strong");
      code.textContent = slotId;
      const name = document.createElement("span");
      name.textContent = mappedTeamForSlot(slotId)?.name?.trim() || "Belum di-mapping";
      button.append(code, name);
      button.addEventListener("click", () => {
        selectedRecapSlot = slotId;
        renderTeamRecap(knockout);
      });
      els.recapTeamList.append(button);
    });
  });

  renderSelectedTeamRecap(selectedRecapSlot, knockout);
}

function renderSelectedTeamRecap(slotId, knockout) {
  els.recapContent.replaceChildren();
  const mapped = mappedTeamForSlot(slotId);
  const head = document.createElement("div");
  head.className = "recap-head";
  const identity = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.textContent = `${SLOT_BY_ID[slotId].category} · Grup ${SLOT_BY_ID[slotId].group}`;
  const title = document.createElement("h3");
  title.textContent = mapped?.name?.trim() || "Belum di-mapping";
  identity.append(eyebrow, title);
  const badge = document.createElement("span");
  badge.textContent = slotId;
  head.append(identity, badge);
  els.recapContent.append(head);

  const entries = collectTeamRecapEntries(slotId, knockout);
  const summary = document.createElement("p");
  summary.className = "recap-summary";
  const recorded = entries.filter((entry) => entry.notes.scorers.trim() || entry.notes.cards.trim()).length;
  summary.textContent = `${entries.length} pertandingan · ${recorded} pertandingan memiliki catatan`;
  els.recapContent.append(summary);

  const log = document.createElement("div");
  log.className = "recap-log";
  entries.forEach((entry) => log.append(renderRecapEntry(entry)));
  els.recapContent.append(log);
}

function collectTeamRecapEntries(slotId, knockout) {
  const groupEntries = GROUP_MATCHES
    .filter((match) => match.home === slotId || match.away === slotId)
    .map((match) => {
      const teamIndex = match.home === slotId ? 0 : 1;
      const result = state.groupResults[match.id] || emptyGroupResult();
      return {
        id: match.id,
        stage: `Grup ${match.group}`,
        opponent: teamIndex === 0 ? match.away : match.home,
        score: formatResultScore(result, false),
        notes: normalizeMatchNotes(result.notes?.[teamIndex]),
        cardCounts: result.cards?.[teamIndex] || normalizeCards(),
      };
    });

  const knockoutEntries = knockout
    .filter((match) => match.home === slotId || match.away === slotId)
    .map((match) => {
      const teamIndex = match.home === slotId ? 0 : 1;
      return {
        id: match.id,
        stage: match.stage,
        opponent: teamIndex === 0 ? match.away : match.home,
        score: formatResultScore(match.result, true),
        notes: normalizeMatchNotes(match.result.notes?.[teamIndex]),
        cardCounts: null,
      };
    });
  return [...groupEntries, ...knockoutEntries];
}

function formatResultScore(result, includePenalties) {
  if (result.home === "" || result.away === "") return "Belum ada skor";
  let label = `${result.home} — ${result.away}`;
  if (includePenalties && result.home === result.away && result.penHome !== "" && result.penAway !== "") {
    label += ` (pen. ${result.penHome} — ${result.penAway})`;
  }
  return label;
}

function renderRecapEntry(entry) {
  const article = document.createElement("article");
  article.className = "recap-entry";
  const head = document.createElement("div");
  head.className = "recap-entry-head";
  const match = document.createElement("div");
  const stage = document.createElement("span");
  stage.textContent = `${entry.id} · ${entry.stage}`;
  const opponent = document.createElement("strong");
  opponent.textContent = `vs ${displayName(entry.opponent)}`;
  match.append(stage, opponent);
  const score = document.createElement("b");
  score.textContent = entry.score;
  head.append(match, score);

  const notes = document.createElement("div");
  notes.className = "recap-notes";
  notes.append(
    renderRecapNote("Pencetak gol", entry.notes.scorers),
    renderRecapNote("Penerima kartu", entry.notes.cards),
  );
  article.append(head, notes);

  if (entry.cardCounts && countNumericCards(entry.cardCounts) > 0) {
    const counts = document.createElement("p");
    counts.className = "recap-card-counts";
    counts.textContent = `Input tie-breaker: ${Number(entry.cardCounts.yellow || 0)} kuning · ${Number(entry.cardCounts.secondYellow || 0)} merah dari dua kuning · ${Number(entry.cardCounts.red || 0)} merah langsung`;
    article.append(counts);
  }
  return article;
}

function renderRecapNote(label, value) {
  const block = document.createElement("div");
  const heading = document.createElement("span");
  heading.textContent = label;
  const text = document.createElement("p");
  text.className = value?.trim() ? "" : "empty";
  text.textContent = value?.trim() || "Belum ada catatan";
  block.append(heading, text);
  return block;
}

function countNumericCards(cards) {
  return Number(cards?.yellow || 0) + Number(cards?.secondYellow || 0) + Number(cards?.red || 0);
}

function renderMapping() {
  els.mappingGrid.replaceChildren();
  const assignedCount = Object.values(state.mapping).filter(Boolean).length;
  const locked = Boolean(state.mappingLocked);
  els.mappingMeta.textContent = `${assignedCount} dari ${TEAM_SLOTS.length} tim terpasang${locked ? " · mapping terkunci" : ""}`;
  els.randomizeMapping.hidden = locked;
  els.resetMapping.hidden = locked;
  els.mappingLock.textContent = locked ? "Unlock mapping" : "Lock mapping";
  els.mappingLock.classList.toggle("is-locked", locked);
  els.mappingLock.setAttribute("aria-pressed", String(locked));

  CATEGORY_CONFIG.forEach((category) => {
    const section = document.createElement("section");
    section.className = "mapping-group mapping-category";
    section.style.setProperty("--group-color", category.color);
    const header = document.createElement("div");
    header.className = "mapping-category-head";
    const heading = document.createElement("h3");
    heading.textContent = category.name;
    const destination = document.createElement("span");
    destination.textContent = category.groups;
    header.append(heading, destination);
    section.append(header);

    masterTeams.filter((team) => team.category === category.name).forEach((team) => {
      const row = document.createElement("div");
      row.className = "mapping-row";
      const assignedSlot = Object.keys(state.mapping).find((slotId) => state.mapping[slotId] === team.id) || null;
      const slot = document.createElement("span");
      slot.className = assignedSlot ? "mapping-slot assigned" : "mapping-slot";
      slot.textContent = assignedSlot || "—";
      const label = document.createElement("label");
      label.htmlFor = `master-${team.id}`;
      label.textContent = team.category;
      const input = document.createElement("input");
      input.id = `master-${team.id}`;
      input.type = "text";
      input.value = team.name;
      input.placeholder = "Nama tim";
      input.disabled = viewOnly;
      input.addEventListener("change", (event) => {
        team.name = event.target.value.trim();
        persistMasterTeams();
        renderAll();
      });
      const identity = document.createElement("div");
      identity.className = "mapping-identity";
      identity.append(label, input);
      row.append(slot, identity);
      section.append(row);
    });
    els.mappingGrid.append(section);
  });
}

function createRandomMapping() {
  const mapping = structuredClone(DEFAULT_STATE.mapping);
  CATEGORY_CONFIG.forEach((category) => {
    const slots = TEAM_SLOTS
      .filter((slot) => category.slotGroups.includes(slot.group))
      .map((slot) => slot.id);
    const teams = shuffle(masterTeams.filter((team) => team.category === category.name));
    slots.forEach((slotId, index) => {
      mapping[slotId] = teams[index]?.id || null;
    });
  });
  return mapping;
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function isMappingComplete() {
  const assigned = Object.entries(state.mapping);
  if (assigned.length !== TEAM_SLOTS.length || assigned.some(([, teamId]) => !teamId)) return false;
  if (new Set(assigned.map(([, teamId]) => teamId)).size !== TEAM_SLOTS.length) return false;
  return assigned.every(([slotId, teamId]) =>
    isTeamAllowedInSlot(masterTeams.find((team) => team.id === teamId), slotId),
  );
}

function prepareForMappingChange(actionLabel) {
  const hasResults = Object.keys(state.groupResults).length > 0 || Object.keys(state.knockoutResults).length > 0;
  if (!hasResults) return true;
  const confirmed = window.confirm(`${actionLabel} akan menghapus seluruh skor dan kartu pertandingan. Lanjutkan?`);
  if (!confirmed) return false;
  state.groupResults = {};
  state.knockoutResults = {};
  return true;
}
