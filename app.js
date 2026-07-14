const MAP_WIDTH = 768;
const MAP_HEIGHT = 1792;

const state = {
  activeView: "preview",
  previewPinned: true,
  previewHasContent: false,
  previewZoom: 100,
  gameType: "towerDefense",
  editObject: "point",
  semanticType: "enemy_spawn",
  mapMotion: "static",
  tool: "point",
  selectedPointId: null,
  selectedObject: null,
  pathDrawMode: "polyline",
  pathWidth: 16,
  activeAreaAction: "brush",
  activeDraftPolyline: null,
  blockingType: "movement",
  brushSize: 48,
  currentMapId: "hulao-entry",
  draftHistory: [],
  map: createEmptyMap("hulao-entry", "第1关 虎牢关入口"),
  draft: createEmptyDraft(),
  dragStart: null,
  isDrawing: false,
  lastBrushPoint: null,
  activeAreaStroke: null,
  obstacleAssetName: "默认障碍",
  selectedCanvasEntity: null,
  selectedShooterInstanceId: null,
  assetEditMode: "move",
  assetCollisionAction: "none",
  draggingAsset: null,
  lassoPoints: [],
  player: { x: 500, y: 1030, r: 18, blocked: false },
  simulation: {
    unitTravelEnabled: false,
    unitsBySpawn: {},
    cooldownBySpawn: {},
    shooterEnemies: [],
    shooterObstacles: [],
    shooterAssetInstances: [],
    shooterAssetCooldowns: {},
    shooterEnemyCooldown: 0,
    shooterObstacleCooldown: 0,
    scrollOffset: 0,
    status: "单位行进：未开启"
  },
  balanceTest: createInitialBalanceTest(),
  balanceMainPanel: "report",
  selectedBalancePlan: null,
  balanceConfigDirty: false,
  pendingBalanceApplication: null,
  gpkb: null,
  gameplaySkeleton: null,
  gameplayTuning: createDefaultGameplayTuning(),
  gameplayMode: "fast",
  gameplayFusionLens: "random",
  gameplayCustomFusionPrompt: "",
  gameplayCustomFusionTarget: null,
  gameplayDirty: false,
  gameplayExperiment: null,
  appliedGameplayExperiment: null,
  gameplayRuntime: createInitialGameplayRuntime(),
  chatBusy: false,
  chatMode: "pro",
  chatAttachments: [],
  pressedKeys: new Set()
};

const collisionColors = {
  movement: "#ef4444",
  projectile: "#f59e0b",
  vision: "#8b5cf6",
  all: "#7f1d1d"
};

const areaColors = {
  placement_tower: "#1ca672",
  slow_zone: "#38bdf8",
  trigger_zone: "#f59e0b",
  activity_boundary: "#14b8a6",
  spawn_area: "#f97316",
  safe_zone: "#22c55e",
  danger_zone: "#ef4444",
  move_area: "#3b82f6",
  cover_area: "#64748b",
  forbidden_area: "#ef4444",
  combat_area: "#dc2626",
  player_bounds: "#22c55e",
  enemy_spawn_zone: "#ef4444",
  obstacle_zone: "#64748b",
  vision_block: "#8b5cf6",
  projectile_block: "#f59e0b",
  collision: "#ef4444"
};

const pointColors = {
  enemy_spawn: "#ef4444",
  target: "#3b82f6",
  boss: "#a855f7",
  resource: "#f59e0b",
  tower_core: "#06b6d4",
  player_spawn: "#22c55e",
  elite_spawn: "#f97316",
  supply: "#eab308",
  respawn: "#14b8a6",
  enemy_anchor: "#ef4444",
  boss_spawn: "#a855f7",
  event_point: "#f59e0b"
};

const unifiedMapPreset = {
    point: [
      ["enemy_spawn", "敌人出生点"],
      ["player_spawn", "玩家出生点"],
      ["target", "终点/消失点"],
      ["tower_core", "攻击目标点"],
      ["boss", "Boss点"],
      ["resource", "资源点"]
    ],
    path: [
      ["movement_route", "移动路线"],
      ["patrol_route", "巡逻/过场路线"]
    ],
    area: [
      ["collision", "碰撞区"],
      ["spawn_area", "敌人刷新区"],
      ["activity_boundary", "活动区"],
      ["placement_tower", "可放置区"]
    ]
};

const gameMapPresets = {
  towerDefense: unifiedMapPreset,
  survivalDefense: unifiedMapPreset,
  shooter: unifiedMapPreset
};

const mapBackgroundSources = {
  "hulao-entry": "assets/map-background.png",
  "gate-defense": "assets/map-background-gate-defense.png",
  "boss-camp": "assets/map-background-boss-camp.png"
};

const mapBackgrounds = Object.fromEntries(
  Object.entries(mapBackgroundSources).map(([id, src]) => {
    const image = new Image();
    image.src = src;
    image.addEventListener("load", () => {
      if (state.currentMapId === id) renderAll();
    });
    return [id, image];
  })
);
const imageCache = new Map();

const balanceProfiles = {
  towerDefense: {
    title: "塔防数值层",
    sections: [
      { key: "rules", label: "关卡规则" },
      { key: "towers", label: "防御塔" },
      { key: "enemies", label: "敌人" },
      { key: "hero", label: "英雄" },
      { key: "boss", label: "Boss" },
      { key: "waves", label: "波次" },
      { key: "metrics", label: "指标面板" }
    ],
    data: {
      rules: [
        { id: "baseHp", name: "基地初始血量", value: 20, note: "失败条件：基地血量 <= 0" },
        { id: "initialGold", name: "初始金币", value: 500, note: "开局建塔资源" },
        { id: "waveCount", name: "关卡波数", value: 6, note: "当前塔防 MVP 固定 6 波" },
        { id: "threeStarHp", name: "三星血量线", value: 16, note: "基地血量 >= 16" },
        { id: "twoStarHp", name: "二星血量线", value: 8, note: "基地血量 >= 8" },
        { id: "oneStarHp", name: "一星血量线", value: 1, note: "基地血量 >= 1" }
      ],
      towers: [
        { id: "arrow_tower", name: "箭楼", level: 1, role: "泛用塔", damageType: "physical", target: "空地", attack: 35, interval: 1.2, range: 3, cost: 100, counter: "刀兵、飞鹰" },
        { id: "arrow_tower", name: "箭楼", level: 2, role: "泛用塔", damageType: "physical", target: "空地", attack: 51, interval: 1.2, range: 3.45, cost: 150, counter: "刀兵、飞鹰" },
        { id: "arrow_tower", name: "箭楼", level: 3, role: "泛用塔", damageType: "physical", target: "空地", attack: 74, interval: 1.2, range: 3.9, cost: 250, counter: "刀兵、飞鹰" },
        { id: "crossbow_camp", name: "重弩营", level: 1, role: "高单体", damageType: "physical", target: "对地", attack: 80, interval: 2.2, range: 4, cost: 150, counter: "高血量地面、Boss" },
        { id: "crossbow_camp", name: "重弩营", level: 2, role: "高单体", damageType: "physical", target: "对地", attack: 116, interval: 2.2, range: 4.45, cost: 200, counter: "高血量地面、Boss" },
        { id: "crossbow_camp", name: "重弩营", level: 3, role: "高单体", damageType: "physical", target: "对地", attack: 168, interval: 2.2, range: 4.9, cost: 300, counter: "高血量地面、Boss" },
        { id: "strategist_platform", name: "军师台", level: 1, role: "破甲法术", damageType: "magic", target: "对地", attack: 55, interval: 1.5, range: 3, cost: 140, counter: "铁骑、术士" },
        { id: "strategist_platform", name: "军师台", level: 2, role: "破甲法术", damageType: "magic", target: "对地", attack: 80, interval: 1.5, range: 3.45, cost: 180, counter: "铁骑、术士" },
        { id: "strategist_platform", name: "军师台", level: 3, role: "破甲法术", damageType: "magic", target: "对地", attack: 116, interval: 1.5, range: 3.9, cost: 260, counter: "铁骑、术士" },
        { id: "fire_oil_camp", name: "火油营", level: 1, role: "灼烧范围感", damageType: "magic", target: "空地", attack: 40, interval: 2, range: 2, cost: 160, counter: "成群单位、空地混合" },
        { id: "fire_oil_camp", name: "火油营", level: 2, role: "灼烧范围感", damageType: "magic", target: "空地", attack: 58, interval: 2, range: 2.45, cost: 220, counter: "成群单位、空地混合" },
        { id: "fire_oil_camp", name: "火油营", level: 3, role: "灼烧范围感", damageType: "magic", target: "空地", attack: 84, interval: 2, range: 2.9, cost: 320, counter: "成群单位、空地混合" },
        { id: "watchtower", name: "瞭望塔", level: 1, role: "对空专精", damageType: "physical", target: "对空", attack: 60, interval: 1, range: 4, cost: 130, counter: "飞鹰斥候" },
        { id: "watchtower", name: "瞭望塔", level: 2, role: "对空专精", damageType: "physical", target: "对空", attack: 87, interval: 1, range: 4.45, cost: 180, counter: "飞鹰斥候" },
        { id: "watchtower", name: "瞭望塔", level: 3, role: "对空专精", damageType: "physical", target: "对空", attack: 126, interval: 1, range: 4.9, cost: 260, counter: "飞鹰斥候" }
      ],
      enemies: [
        { id: "knife_soldier", name: "西凉刀兵", type: "ground", hp: 200, attack: 30, interval: 1.2, speed: 1, physicalResistance: 0, magicResistance: 0, leakDamage: 1, rewardGold: 20, role: "基础兵" },
        { id: "iron_cavalry", name: "西凉铁骑", type: "ground", hp: 500, attack: 75, interval: 1.4, speed: 1.2, physicalResistance: 0.7, magicResistance: 0, leakDamage: 2, rewardGold: 40, role: "高血高物抗" },
        { id: "sorcerer", name: "西凉术士", type: "ground", hp: 300, attack: 55, interval: 1.6, speed: 0.8, physicalResistance: 0.85, magicResistance: 0, leakDamage: 2, rewardGold: 35, role: "高物抗慢速" },
        { id: "eagle_scout", name: "飞鹰斥候", type: "air", hp: 250, attack: 40, interval: 1.3, speed: 1.5, physicalResistance: 0, magicResistance: 0, leakDamage: 3, rewardGold: 30, role: "高速飞行单位" }
      ],
      hero: [
        { id: "lvbu", name: "吕布", hp: 2600, attack: 140, interval: 1.5, target: "对地", damageTakenMultiplier: 1.18, regenPercent: 0.006, reviveTime: 30, note: "可操作移动防线" },
        { id: "sweep", name: "方天横扫", hp: 0, attack: 280, interval: 25, target: "近身范围", damageTakenMultiplier: 0, regenPercent: 0, reviveTime: 0, note: "物理范围技能，范围 2.4" },
        { id: "roar", name: "战神怒吼", hp: 0, attack: 380, interval: 40, target: "大范围", damageTakenMultiplier: 0, regenPercent: 0, reviveTime: 0, note: "法术范围技能，范围 3.2" }
      ],
      boss: [
        { id: "liubei", name: "刘备 Boss", hp: 1200, attack: 120, interval: 1, speed: 1, armor: 0.1, leakDamage: 5, rewardGold: 300, note: "终局单体输出检验" },
        { id: "dash", name: "龙魂突进", hp: 0, attack: 0, interval: 12, speed: 3, armor: 0, leakDamage: 0, rewardGold: 0, note: "向前突进 3 格" },
        { id: "command", name: "仁德号令", hp: 0, attack: 0, interval: 18, speed: 1.2, armor: 0, leakDamage: 0, rewardGold: 0, note: "敌军加速 +20%，持续 8s" }
      ],
      waves: [
        { id: "wave1", name: "第1波", knife_soldier: 8, iron_cavalry: 0, sorcerer: 0, eagle_scout: 0, boss: 0, reward: 100, spawnInterval: 1, bossDelay: 0 },
        { id: "wave2", name: "第2波", knife_soldier: 6, iron_cavalry: 4, sorcerer: 0, eagle_scout: 0, boss: 0, reward: 120, spawnInterval: 1, bossDelay: 0 },
        { id: "wave3", name: "第3波", knife_soldier: 5, iron_cavalry: 0, sorcerer: 5, eagle_scout: 0, boss: 0, reward: 150, spawnInterval: 0.8, bossDelay: 0 },
        { id: "wave4", name: "第4波", knife_soldier: 4, iron_cavalry: 0, sorcerer: 0, eagle_scout: 8, boss: 0, reward: 180, spawnInterval: 0.7, bossDelay: 0 },
        { id: "wave5", name: "第5波", knife_soldier: 5, iron_cavalry: 3, sorcerer: 3, eagle_scout: 3, boss: 0, reward: 200, spawnInterval: 0.6, bossDelay: 0 },
        { id: "wave6", name: "第6波", knife_soldier: 8, iron_cavalry: 4, sorcerer: 4, eagle_scout: 4, boss: 1, reward: 0, spawnInterval: 0.8, bossDelay: 8 }
      ]
    }
  }
};

const balanceColumns = {
  rules: [
    { key: "name", label: "规则" },
    { key: "value", label: "数值", type: "number", step: 1 },
    { key: "note", label: "说明" }
  ],
  towers: [
    { key: "name", label: "塔" },
    { key: "level", label: "等级", type: "number", step: 1 },
    { key: "role", label: "定位" },
    { key: "damageType", label: "伤害" },
    { key: "target", label: "目标" },
    { key: "attack", label: "攻击", type: "number", step: 1 },
    { key: "interval", label: "间隔", type: "number", step: 0.1 },
    { key: "range", label: "射程", type: "number", step: 0.05 },
    { key: "cost", label: "成本", type: "number", step: 10 },
    { key: "dps", label: "DPS", readonly: true, derive: (row) => row.attack / row.interval },
    { key: "counter", label: "克制" }
  ],
  enemies: [
    { key: "name", label: "敌人" },
    { key: "type", label: "类型" },
    { key: "hp", label: "生命", type: "number", step: 10 },
    { key: "attack", label: "攻击", type: "number", step: 1 },
    { key: "interval", label: "攻速", type: "number", step: 0.1 },
    { key: "speed", label: "移速", type: "number", step: 0.1 },
    { key: "physicalResistance", label: "物抗", type: "number", step: 0.05, format: "percent" },
    { key: "magicResistance", label: "魔抗", type: "number", step: 0.05, format: "percent" },
    { key: "leakDamage", label: "漏怪", type: "number", step: 1 },
    { key: "rewardGold", label: "金币", type: "number", step: 5 },
    { key: "role", label: "定位" }
  ],
  hero: [
    { key: "name", label: "英雄/技能" },
    { key: "hp", label: "生命", type: "number", step: 50 },
    { key: "attack", label: "伤害", type: "number", step: 10 },
    { key: "interval", label: "间隔/冷却", type: "number", step: 0.5 },
    { key: "target", label: "目标" },
    { key: "damageTakenMultiplier", label: "受伤倍率", type: "number", step: 0.01 },
    { key: "regenPercent", label: "回血/秒", type: "number", step: 0.001, format: "percent" },
    { key: "reviveTime", label: "复活", type: "number", step: 1 },
    { key: "heroDps", label: "DPS", readonly: true, derive: (row) => (row.attack && row.interval ? row.attack / row.interval : 0) },
    { key: "note", label: "说明" }
  ],
  boss: [
    { key: "name", label: "Boss/技能" },
    { key: "hp", label: "生命", type: "number", step: 50 },
    { key: "attack", label: "攻击", type: "number", step: 10 },
    { key: "interval", label: "间隔/冷却", type: "number", step: 0.5 },
    { key: "speed", label: "速度/倍率", type: "number", step: 0.1 },
    { key: "armor", label: "护甲", type: "number", step: 0.05, format: "percent" },
    { key: "leakDamage", label: "漏怪", type: "number", step: 1 },
    { key: "rewardGold", label: "金币", type: "number", step: 10 },
    { key: "bossPressure", label: "压力", readonly: true, derive: (row) => row.hp + row.leakDamage * 120 + row.attack * 3 },
    { key: "note", label: "说明" }
  ],
  waves: [
    { key: "name", label: "波次" },
    { key: "knife_soldier", label: "刀兵", type: "number", step: 1 },
    { key: "iron_cavalry", label: "铁骑", type: "number", step: 1 },
    { key: "sorcerer", label: "术士", type: "number", step: 1 },
    { key: "eagle_scout", label: "飞鹰", type: "number", step: 1 },
    { key: "boss", label: "Boss", type: "number", step: 1 },
    { key: "reward", label: "奖励", type: "number", step: 10 },
    { key: "spawnInterval", label: "间隔", type: "number", step: 0.1 },
    { key: "bossDelay", label: "Boss延迟", type: "number", step: 1 },
    { key: "waveHp", label: "总生命", readonly: true, derive: waveTotalHp },
    { key: "waveGold", label: "总金币", readonly: true, derive: waveGold },
    { key: "pressure", label: "压力", readonly: true, derive: wavePressure }
  ]
};

const tabs = document.querySelectorAll(".tab[data-view]");
const panels = document.querySelectorAll(".view-panel");
const workspace = document.querySelector(".workspace");
const previewLane = document.querySelector(".preview-lane");
const laneResizer = document.getElementById("laneResizer");
const splitResizer = document.getElementById("splitResizer");
const pinPreview = document.getElementById("pinPreview");
const mapCanvas = document.getElementById("mapCanvas");
const mapCtx = mapCanvas.getContext("2d");
const previewCanvas = document.getElementById("previewCanvas");
const previewCtx = previewCanvas.getContext("2d");
const previewDeviceStack = document.querySelector(".preview-device-stack");
const previewReplay = document.getElementById("previewReplay");
const previewZoomOut = document.getElementById("previewZoomOut");
const previewZoomIn = document.getElementById("previewZoomIn");
const previewZoomValue = document.getElementById("previewZoomValue");
const objectList = document.getElementById("objectList");
const assetGrid = document.getElementById("assetGrid");
const balanceMenu = document.getElementById("balanceMenu");
const balanceMenuNext = document.getElementById("balanceMenuNext");
const balanceMainTabs = document.querySelectorAll("[data-balance-main]");
const balanceMainPanels = document.querySelectorAll("[data-balance-panel]");
const balanceRunStatus = document.getElementById("balanceRunStatus");
const balanceRunMeta = document.getElementById("balanceRunMeta");
const balanceTestSpeed = document.getElementById("balanceTestSpeed");
const runBalanceTest = document.getElementById("runBalanceTest");
const balanceReport = document.getElementById("balanceReport");
const balancePlans = document.getElementById("balancePlans");
const balanceTableScroll = document.querySelector(".balance-table-scroll");
const balanceTableNext = document.getElementById("balanceTableNext");
const balanceTableHead = document.getElementById("balanceTableHead");
const balanceRows = document.getElementById("balanceRows");
const balanceTitle = document.getElementById("balanceTitle");
const balanceSubtitle = document.getElementById("balanceSubtitle");
const insightText = document.getElementById("insightText");
const mapSelect = document.getElementById("mapSelect");
const draftStatus = document.getElementById("draftStatus");
const chatNotice = document.getElementById("chatNotice");
const toolSettingHint = document.getElementById("toolSettingHint");
const gameTypeButtons = document.querySelectorAll("[data-game-type]");
const editObjectButtons = document.querySelectorAll("[data-edit-object]");
const semanticTypeButtons = document.getElementById("semanticTypeButtons");
const objectSettings = document.querySelectorAll("[data-object-settings]");
const unitTravelToggle = document.getElementById("unitTravelToggle");
const simulationStatus = document.getElementById("simulationStatus");
const areaActionButtons = document.querySelectorAll("[data-area-action]");
const pathModeButtons = document.querySelectorAll("[data-path-mode]");
const pathWidth = document.getElementById("pathWidth");
const pathWidthValue = document.getElementById("pathWidthValue");
const finishPolyline = document.getElementById("finishPolyline");
const blockingTypeSetting = document.getElementById("blockingTypeSetting");
const blockingTypeButtons = document.querySelectorAll("[data-blocking-type]");
const brushSize = document.getElementById("brushSize");
const brushSizeValue = document.getElementById("brushSizeValue");
const normalPathSettings = document.querySelectorAll(".normal-path-setting");
const shooterPathSettings = document.getElementById("shooterPathSettings");
const shooterObstacleSettings = document.getElementById("shooterObstacleSettings");
const scrollDirection = document.getElementById("scrollDirection");
const shooterEntry = document.getElementById("shooterEntry");
const shooterMovement = document.getElementById("shooterMovement");
const shooterFormation = document.getElementById("shooterFormation");
const shooterFrequency = document.getElementById("shooterFrequency");
const addShooterRouteRule = document.getElementById("addShooterRouteRule");
const obstacleAssetInput = document.getElementById("obstacleAssetInput");
const obstacleCollisionMark = document.getElementById("obstacleCollisionMark");
const obstacleMovement = document.getElementById("obstacleMovement");
const obstacleFrequency = document.getElementById("obstacleFrequency");
const obstacleCollisionRule = document.getElementById("obstacleCollisionRule");
const mapBackgroundInput = document.getElementById("mapBackgroundInput");
const mapAssetInput = document.getElementById("mapAssetInput");
const resourceStrip = document.getElementById("resourceStrip");
const selectedConfig = document.getElementById("selectedConfig");
const objectListSection = document.querySelector(".object-list-section");
const mapObjectFields = document.querySelectorAll(".map-object-field");
const shooterScrollSettings = document.getElementById("shooterScrollSettings");
const mapScrollDirection = document.getElementById("mapScrollDirection");
const mapScrollSpeed = document.getElementById("mapScrollSpeed");
const mapMotionButtons = document.querySelectorAll("[data-map-motion]");
const mapScrollOptions = document.getElementById("mapScrollOptions");
const chatStream = document.getElementById("chatStream");
const chatComposerInput = document.getElementById("chatComposerInput");
const chatSend = document.getElementById("chatSend");
const chatAttach = document.getElementById("chatAttach");
const chatAttachmentInput = document.getElementById("chatAttachmentInput");
const chatAttachmentPreview = document.getElementById("chatAttachmentPreview");
const chatVoice = document.getElementById("chatVoice");
const chatModeButton = document.getElementById("chatModeButton");
const chatExtensionsToggle = document.getElementById("chatExtensionsToggle");
const extensionPopover = document.getElementById("extensionPopover");
const composerShell = document.getElementById("composerShell");
const gameplayPrimaryLoop = document.getElementById("gameplayPrimaryLoop");
const gameplaySecondaryLoop = document.getElementById("gameplaySecondaryLoop");
const gameplayFusionTemplate = document.getElementById("gameplayFusionTemplate");
const gameplayFusionOrbit = document.getElementById("gameplayFusionOrbit");
const fusionGlobeCanvas = document.getElementById("fusionGlobeCanvas");
const fusionGlobeLabels = document.getElementById("fusionGlobeLabels");
const fusionShuffle = document.getElementById("fusionShuffle");
const fusionCustomRow = document.getElementById("fusionCustomRow");
const fusionCustomInput = document.getElementById("fusionCustomInput");
const fusionCustomApply = document.getElementById("fusionCustomApply");
const fusionFocusSummary = document.getElementById("fusionFocusSummary");
const gameplayTuningRanges = document.querySelectorAll("[data-tuning-range]");
const gameplayTuningImpact = document.getElementById("gameplayTuningImpact");
const gameplayRoute = document.getElementById("gameplayRoute");
const gameplayTools = document.querySelector(".gameplay-tools");
const gameplayModeButtons = document.querySelectorAll("[data-gameplay-mode]");
const gameplayApply = document.getElementById("gameplayApply");
const gameplayRuntimeStatus = document.getElementById("gameplayRuntimeStatus");
const gameplaySummary = document.getElementById("gameplaySummary");
const gameplayFeedback = document.getElementById("gameplayFeedback");
const gameplayModules = document.getElementById("gameplayModules");
const gameplayEntities = document.getElementById("gameplayEntities");
const gameplaySkeletonJson = document.getElementById("gameplaySkeletonJson");

let gameplayFusionGlobe = null;

const toolHints = {
  collision: "选择碰撞类型和笔刷方式，在预览上绘制碰撞区域。",
  path: "从点位开始绘制路线；路线端点靠近点位时会自动吸附并建立绑定。",
  area: "在预览上拖拽绘制碰撞、刷新、活动或可放置区域。",
  point: "在预览里点击放置当前对象类型的点位。"
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setView(tab.dataset.view);
  });
});

setupHorizontalResize(laneResizer, workspace, ({ clientX, rect }) => {
  const minChat = 420;
  const minWorkbench = 520;
  const width = clamp(clientX - rect.left, minChat, rect.width - minWorkbench);
  workspace.style.setProperty("--chat-lane-width", `${width}px`);
});

setupHorizontalResize(splitResizer, previewLane, ({ clientX, rect }) => {
  if (!previewLane.classList.contains("split-active")) return;
  const minPreview = 280;
  const minEditor = 360;
  const width = clamp(clientX - rect.left, minPreview, rect.width - minEditor);
  previewLane.style.setProperty("--pinned-preview-width", `${width}px`);
});

pinPreview.addEventListener("click", () => {
  state.previewPinned = !state.previewPinned;
  pinPreview.classList.toggle("active", state.previewPinned);
  pinPreview.setAttribute("aria-pressed", String(state.previewPinned));
  updateLayoutClasses();
  renderAll();
});

gameTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.gameType = button.dataset.gameType;
    clearSelectedObject();
    state.activeDraftPolyline = null;
    gameTypeButtons.forEach((item) => item.classList.toggle("active", item === button));
    syncSemanticOptions(true);
    syncScrollControls();
    resetSimulation();
    renderAll();
  });
});

editObjectButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.editObject = button.dataset.editObject;
    clearSelectedObject();
    state.activeDraftPolyline = null;
    editObjectButtons.forEach((item) => item.classList.toggle("active", item === button));
    syncSemanticOptions(true);
    renderAll();
  });
});

unitTravelToggle.addEventListener("click", () => {
  state.simulation.unitTravelEnabled = !state.simulation.unitTravelEnabled;
  unitTravelToggle.classList.toggle("active", state.simulation.unitTravelEnabled);
  unitTravelToggle.setAttribute("aria-pressed", String(state.simulation.unitTravelEnabled));
  unitTravelToggle.textContent = state.simulation.unitTravelEnabled ? "暂停模拟" : "开始模拟";
  resetSimulation();
  state.simulation.status = state.simulation.unitTravelEnabled ? "单位行进：已开启，出生点将各自生成 1 个模拟单位。" : "单位行进：未开启";
  renderAll();
});

areaActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.activeAreaAction = button.dataset.areaAction;
    areaActionButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

pathModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.pathDrawMode = button.dataset.pathMode;
    state.activeDraftPolyline = null;
    pathModeButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderAll();
  });
});

pathWidth.addEventListener("input", () => {
  state.pathWidth = Number(pathWidth.value);
  pathWidthValue.textContent = pathWidth.value;
  updateActivePathWidth(state.pathWidth);
  renderAll();
});

finishPolyline.addEventListener("click", () => {
  commitActivePolyline();
});

addShooterRouteRule.addEventListener("click", () => {
  addShooterRouteRuleDraft();
});

obstacleAssetInput.addEventListener("change", () => {
  const file = obstacleAssetInput.files?.[0];
  if (!file) return;
  state.obstacleAssetName = file.name;
  renderAll();
});

mapBackgroundInput.addEventListener("change", () => {
  const file = mapBackgroundInput.files?.[0];
  if (!file) return;
  readImageFile(file, (url) => {
    state.previewHasContent = true;
    state.map.backgroundUrl = url;
    state.map.backgroundName = file.name;
    cacheImage(url, renderAll);
    selectCanvasEntity("background");
    chatNotice.textContent = `已导入底图：${file.name}`;
    renderAll();
  });
  mapBackgroundInput.value = "";
});

function handleMapAssetInputChange(event) {
  const input = event.target;
  const files = Array.from(input.files || []);
  if (!files.length) return;
  state.previewHasContent = true;
  readImageFiles(files, (urls) => {
    const object = createMapAssetObject(files[0], urls[0], urls);
    state.map.objects.push(object);
    cacheImage(object.url, () => {
      normalizeAssetSize(object);
      urls.slice(1).forEach((url) => cacheImage(url));
      renderAll();
    });
    selectCanvasEntity("asset", object.id);
    chatNotice.textContent = files.length > 1 ? `已导入序列帧素材：${files.length} 帧` : `已导入素材：${files[0].name}`;
    renderAll();
  });
  input.value = "";
}

resourceStrip.addEventListener("click", (event) => {
  const backgroundAction = event.target.closest("[data-background-action]");
  if (backgroundAction) {
    event.preventDefault();
    event.stopPropagation();
    if (backgroundAction.dataset.backgroundAction === "replace") mapBackgroundInput.click();
    if (backgroundAction.dataset.backgroundAction === "delete") {
      state.map.backgroundUrl = null;
      state.map.backgroundName = null;
      selectCanvasEntity("background");
      chatNotice.textContent = "已切换为预置底图。";
      renderAll();
    }
    return;
  }
  const tile = event.target.closest("[data-resource-kind]");
  if (!tile) return;
  if (tile.dataset.resourceKind === "background") {
    selectCanvasEntity("background");
    return;
  }
  if (tile.dataset.resourceKind === "asset") {
    selectCanvasEntity("asset", tile.dataset.assetId);
  }
});

selectedConfig.addEventListener("input", (event) => {
  handleSelectedConfigInput(event);
});

selectedConfig.addEventListener("change", (event) => {
  handleSelectedConfigInput(event);
});

selectedConfig.addEventListener("click", (event) => {
  handleSelectedConfigClick(event);
});

blockingTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.blockingType = button.dataset.blockingType;
    blockingTypeButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

brushSize.addEventListener("input", () => {
  state.brushSize = Number(brushSize.value);
  brushSizeValue.textContent = brushSize.value;
});

document.getElementById("clearLayer").addEventListener("click", () => {
  clearCurrentDraftLayer();
  state.draftHistory.push({ action: "clear", tool: state.tool });
  state.draft.dirty = hasDraftChanges();
  state.activeDraftPolyline = null;
  state.activeAreaStroke = null;
  renderAll();
});

document.getElementById("applyDraft").addEventListener("click", () => {
  applyDraft();
});

document.getElementById("simulateChatMapChange")?.addEventListener("click", () => {
  simulateChatMapChange();
});

mapSelect.addEventListener("change", () => {
  state.currentMapId = mapSelect.value;
  state.map = createMapById(mapSelect.value);
  syncScrollControls();
  clearSelectedObject();
  discardDraft();
  resetSimulation();
  chatNotice.textContent = `已切换到${state.map.name}，地图草稿已清空。`;
  renderAll();
});

mapScrollDirection.addEventListener("change", () => {
  state.map.scrollDirection = mapScrollDirection.value;
  resetSimulation();
  renderAll();
});

mapScrollSpeed.addEventListener("change", () => {
  state.map.scrollSpeed = mapScrollSpeed.value;
  resetSimulation();
  renderAll();
});

mapMotionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.mapMotion = button.dataset.mapMotion;
    state.map.motion = state.mapMotion;
    mapMotionButtons.forEach((item) => item.classList.toggle("active", item === button));
    mapScrollOptions?.classList.toggle("hidden", state.mapMotion !== "scroll");
    resetSimulation();
    renderAll();
  });
});

mapCanvas.addEventListener("mousedown", (event) => {
  handleEditStart(event, "map");
});

mapCanvas.addEventListener("mousemove", (event) => {
  handleEditMove(event, "map");
});

mapCanvas.addEventListener("mouseup", (event) => {
  handleEditEnd(event, "map");
});

mapCanvas.addEventListener("dblclick", () => {
  commitActivePolyline();
});

mapCanvas.addEventListener("mouseleave", (event) => {
  handleEditEnd(event, "map");
});

previewCanvas.addEventListener("mousedown", (event) => {
  if (state.activeView === "gameplay") {
    handleGameplayCanvasClick(event);
    return;
  }
  if (!canEditOnPinnedPreview()) {
    selectShooterInstanceFromEvent(event, "preview");
    return;
  }
  handleEditStart(event, "preview");
});

previewCanvas.addEventListener("mousemove", (event) => {
  if (!canEditOnPinnedPreview()) return;
  handleEditMove(event, "preview");
});

previewCanvas.addEventListener("mouseup", (event) => {
  if (!canEditOnPinnedPreview()) return;
  handleEditEnd(event, "preview");
});

previewCanvas.addEventListener("dblclick", () => {
  if (!canEditOnPinnedPreview()) return;
  commitActivePolyline();
});

previewCanvas.addEventListener("mouseleave", (event) => {
  if (!canEditOnPinnedPreview()) return;
  handleEditEnd(event, "preview");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && state.activeDraftPolyline) {
    event.preventDefault();
    commitActivePolyline();
    return;
  }
  if (!isMovementKey(event.key)) return;
  event.preventDefault();
  state.pressedKeys.add(event.key.toLowerCase());
});

window.addEventListener(
  "mousedown",
  (event) => {
    if (!state.activeDraftPolyline || state.tool !== "path") return;
    const path = event.composedPath();
    if (path.includes(mapCanvas) || path.includes(previewCanvas)) return;
    commitActivePolyline();
  },
  true
);

window.addEventListener("keyup", (event) => {
  if (!isMovementKey(event.key)) return;
  state.pressedKeys.delete(event.key.toLowerCase());
});

balanceMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-balance]");
  if (!button) return;
  balanceMenu.querySelectorAll("[data-balance]").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  if (balanceTableScroll) balanceTableScroll.scrollLeft = 0;
  renderBalance(button.dataset.balance);
});

balanceMenuNext?.addEventListener("click", () => scrollBalanceOverflow(balanceMenu, "menu"));
balanceTableNext?.addEventListener("click", () => scrollBalanceOverflow(balanceTableScroll, "table"));
balanceMenu?.addEventListener("scroll", updateBalanceOverflowControls);
balanceTableScroll?.addEventListener("scroll", updateBalanceOverflowControls);
window.addEventListener("resize", updateBalanceOverflowControls);

balanceMainTabs.forEach((button) => {
  button.addEventListener("click", () => setBalanceMainPanel(button.dataset.balanceMain));
});

runBalanceTest.addEventListener("click", () => {
  runCurrentBalanceAction();
});

balanceTestSpeed.addEventListener("change", () => {
  state.balanceTest.speed = Number(balanceTestSpeed.value || 1);
  renderBalanceRunSummary();
});

balancePlans.addEventListener("click", (event) => {
  const button = event.target.closest("[data-plan-key]");
  if (!button) return;
  state.selectedBalancePlan = button.dataset.planKey;
  renderBalancePlans();
  updateBalanceActionState();
});

chatSend.addEventListener("click", () => {
  handleChatSubmit();
});

chatComposerInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  handleChatSubmit();
});

chatAttach?.addEventListener("click", () => {
  chatAttachmentInput?.click();
});

chatAttachmentInput?.addEventListener("change", () => {
  const files = Array.from(chatAttachmentInput.files || []);
  if (!files.length) return;
  state.chatAttachments = files.map((file, index) => ({
    id: `chat_media_${Date.now()}_${index}`,
    file,
    name: file.name,
    type: file.type || "application/octet-stream",
    kind: file.type.startsWith("video/") ? "video" : "image"
  }));
  renderChatAttachmentPreview();
  chatAttachmentInput.value = "";
});

chatAttachmentPreview?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-chat-attachment]");
  if (!removeButton) return;
  state.chatAttachments = state.chatAttachments.filter((item) => item.id !== removeButton.dataset.removeChatAttachment);
  renderChatAttachmentPreview();
});

chatExtensionsToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleExtensionPopover(extensionPopover?.hidden);
});

extensionPopover?.addEventListener("click", (event) => {
  const tab = event.target.closest(".extension-tabs button");
  if (tab) {
    extensionPopover.querySelectorAll(".extension-tabs button").forEach((button) => {
      const active = button === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    filterExtensionRows(tab.dataset.extensionTab || "all");
  }
  event.stopPropagation();
});

document.addEventListener("click", (event) => {
  if (!extensionPopover || extensionPopover.hidden) return;
  if (composerShell?.contains(event.target)) return;
  toggleExtensionPopover(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !extensionPopover || extensionPopover.hidden) return;
  toggleExtensionPopover(false);
});

chatVoice?.addEventListener("click", () => {
  chatNotice.textContent = "语音输入为占位演示：当前请使用文本或附件继续。";
});

chatModeButton?.addEventListener("click", () => {
  renderChatModeButton();
  chatNotice.textContent = "Auto 会根据输入自动选择合适的 Skills、工具和模型。";
});

previewReplay.addEventListener("click", () => {
  replayPreview();
});

previewZoomOut.addEventListener("click", () => {
  setPreviewZoom(state.previewZoom - 10);
});

previewZoomIn.addEventListener("click", () => {
  setPreviewZoom(state.previewZoom + 10);
});

gameplayModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.gameplayMode = button.dataset.gameplayMode;
    renderGameplayEditor();
  });
});

gameplayApply.addEventListener("click", () => {
  if (!canApplyGameplayChanges()) return;
  if (!state.gameplayRuntime.supported) {
    state.gameplayRuntime.message = "未应用：当前玩法组合暂未支持试玩";
    chatNotice.textContent = "当前玩法组合暂未支持试玩，未应用到项目。";
    renderGameplayEditor();
    return;
  }
  state.appliedGameplayExperiment = structuredClone(activeGameplayExperiment());
  state.gameplayDirty = false;
  state.gameplayRuntime.message = `已应用：${gameplayFusionTitle(state.gameplaySkeleton)}`;
  chatNotice.textContent = `当前玩法已应用：${primaryLoopLabel(state.appliedGameplayExperiment.primaryLoop)} / ${secondaryLoopLabel(state.appliedGameplayExperiment.secondaryLoop)}。地图与平衡性编辑将按该玩法方案衔接。`;
  appendGameplayApplicationToChat();
  renderGameplayEditor();
});

function setPreviewZoom(nextZoom) {
  state.previewZoom = Math.max(70, Math.min(140, nextZoom));
  updatePreviewZoomControls();
}

function updatePreviewZoomControls() {
  previewDeviceStack.style.setProperty("--preview-zoom", String(state.previewZoom / 100));
  previewZoomValue.textContent = `${state.previewZoom}%`;
  previewZoomOut.disabled = state.previewZoom <= 70;
  previewZoomIn.disabled = state.previewZoom >= 140;
}

function replayPreview() {
  if (state.activeView === "gameplay" || state.gameplaySkeleton) {
    restartGameplayPreview();
    return;
  }
  state.player = { x: 500, y: 1030, r: 18, blocked: false };
  resetSimulation();
  renderAll();
}

function restartGameplayPreview() {
  if (!state.gameplaySkeleton) {
    state.gameplayRuntime.message = "试玩：等待生成";
    renderGameplayEditor();
    return;
  }
  resetGameplayRuntime();
  state.gameplayRuntime.running = true;
  state.gameplayRuntime.message = "战斗重新开始";
  renderGameplayEditor();
}

gameplayPrimaryLoop.addEventListener("change", () => {
  state.gameplayTuning.primaryLoop = gameplayPrimaryLoop.value;
  state.gameplayFusionLens = gameplayFusionLensIdFromTuning(state.gameplayTuning) || state.gameplayFusionLens;
  applyGameplayTuning();
});

gameplaySecondaryLoop.addEventListener("change", () => {
  state.gameplayTuning.secondaryLoop = gameplaySecondaryLoop.value;
  state.gameplayFusionLens = gameplayFusionLensIdFromTuning(state.gameplayTuning) || state.gameplayFusionLens;
  applyGameplayTuning();
});

fusionShuffle?.addEventListener("click", () => {
  applyNextGameplayFusionLens();
});

gameplayFusionOrbit.addEventListener("click", (event) => {
  const button = event.target.closest("[data-fusion-lens]");
  if (!button) return;
  if (button.dataset.fusionLens === "custom") {
    showFusionCustomInput();
    return;
  }
  applyGameplayFusionLens(button.dataset.fusionLens);
});

fusionCustomApply.addEventListener("click", () => {
  applyCustomGameplayFusionPrompt();
});

fusionCustomInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  applyCustomGameplayFusionPrompt();
});

[gameplayFusionTemplate].forEach((group) => {
  group.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tuning-field]");
    if (!button) return;
    const nextPrimaryLoop = button.dataset.primaryLoop || state.gameplayTuning.primaryLoop;
    const nextSecondaryLoop = button.dataset.secondaryLoop || "";
    const nextLens = button.dataset.fusionLens || gameplayFusionLensIdForPair(nextPrimaryLoop, nextSecondaryLoop);
    const sameSelection = state.gameplayTuning.primaryLoop === nextPrimaryLoop &&
      state.gameplayTuning.secondaryLoop === nextSecondaryLoop &&
      state.gameplayTuning[button.dataset.tuningField] === button.dataset.tuningValue &&
      currentGameplayFusionLensId() === nextLens;
    if (sameSelection) return;
    state.gameplayTuning.primaryLoop = nextPrimaryLoop;
    state.gameplayTuning.secondaryLoop = nextSecondaryLoop;
    state.gameplayTuning[button.dataset.tuningField] = button.dataset.tuningValue;
    state.gameplayFusionLens = nextLens || gameplayFusionLensIdFromTuning(state.gameplayTuning) || state.gameplayFusionLens;
    state.gameplayCustomFusionTarget = null;
    applyGameplayTuning();
  });
});

gameplayTuningRanges.forEach((input) => {
  input.addEventListener("input", () => {
    state.gameplayTuning[input.dataset.tuningRange] = Number(input.value);
    applyGameplayTuning();
  });
});

function setView(view) {
  state.activeView = view;
  if (view === "gameplay" && !state.previewPinned) {
    state.previewPinned = true;
    pinPreview.classList.add("active");
    pinPreview.setAttribute("aria-pressed", "true");
  }
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === view));
  updateLayoutClasses();
  renderAll();
}

function updateLayoutClasses() {
  const splitActive = state.previewPinned && state.activeView !== "preview";
  const mapEditActive = state.previewPinned && state.activeView === "map";
  const gameplayActive = state.previewPinned && state.activeView === "gameplay";
  previewLane.classList.toggle("preview-pinned", state.previewPinned);
  previewLane.classList.toggle("split-active", splitActive);
  previewLane.classList.toggle("map-edit-active", mapEditActive);
  previewLane.classList.toggle("gameplay-active", gameplayActive);
  workspace.classList.toggle("has-pinned-preview", splitActive);
}

function setupHorizontalResize(handle, container, onResize) {
  if (!handle || !container) return;
  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing");

    const resize = (moveEvent) => {
      const rect = container.getBoundingClientRect();
      onResize({ clientX: moveEvent.clientX, rect });
      renderAll();
    };

    const stop = () => {
      document.body.classList.remove("is-resizing");
      handle.removeEventListener("pointermove", resize);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };

    handle.addEventListener("pointermove", resize);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  });
}

function updateToolSettings() {
  const assetSelected = state.selectedCanvasEntity?.kind === "asset";
  mapObjectFields.forEach((field) => field.classList.toggle("hidden", assetSelected));
  if (shooterScrollSettings) shooterScrollSettings.classList.add("hidden");
  objectSettings.forEach((setting) => {
    setting.classList.toggle("hidden", assetSelected || setting.dataset.objectSettings !== state.editObject);
  });
  if (toolSettingHint) toolSettingHint.textContent = toolHints[state.editObject] || toolHints[state.tool];
  if (blockingTypeSetting) blockingTypeSetting.classList.toggle("hidden", state.semanticType !== "collision");
  normalPathSettings.forEach((item) => item.classList.remove("hidden"));
  shooterPathSettings?.classList.add("hidden");
  shooterObstacleSettings?.classList.add("hidden");
}

function syncScrollControls() {
  if (!mapScrollDirection || !mapScrollSpeed) return;
  mapScrollDirection.value = state.map.scrollDirection || "vertical";
  mapScrollSpeed.value = state.map.scrollSpeed || "medium";
  state.mapMotion = state.map.motion || "static";
  mapMotionButtons.forEach((button) => button.classList.toggle("active", button.dataset.mapMotion === state.mapMotion));
  mapScrollOptions?.classList.toggle("hidden", state.mapMotion !== "scroll");
  if (shooterScrollSettings) shooterScrollSettings.classList.add("hidden");
}

function renderSelectedConfig() {
  const assetSelected = state.selectedCanvasEntity?.kind === "asset";
  const selectedPath = findSelectedPath();
  if (objectListSection) objectListSection.classList.toggle("hidden", assetSelected);
  if (selectedPath) {
    selectedConfig.classList.remove("hidden");
    selectedConfig.innerHTML = renderRouteExecutionConfig(selectedPath);
    updateToolSettings();
    return;
  }
  if (!assetSelected) {
    selectedConfig.classList.add("hidden");
    selectedConfig.innerHTML = "";
    updateToolSettings();
    return;
  }
  selectedConfig.classList.remove("hidden");
  const object = findAsset(state.selectedCanvasEntity.id);
  if (!object) {
    state.selectedCanvasEntity = null;
    renderSelectedConfig();
    return;
  }
  selectedConfig.innerHTML = renderAssetConfig(object);
  updateToolSettings();
}

function findSelectedPath() {
  if (state.selectedObject?.bucket !== "paths") return null;
  const target = state.selectedObject.source === "map" ? state.map : state.draft;
  return target.paths.find((path) => path.id === state.selectedObject.id) || null;
}

function routeSourceOptions(path) {
  const pointOptions = [...state.map.points, ...state.draft.points]
    .filter((point) => path.type === "movement_route"
      ? ["enemy_spawn", "boss"].includes(point.type)
      : ["player_spawn", "enemy_spawn", "boss"].includes(point.type))
    .map((point) => ({
      value: `point:${point.id}`,
      label: `${semanticLabel(point.type)} · ${point.name || fallbackPointName(point)}`
    }));
  const areaOptions = path.type === "movement_route"
    ? [...state.map.placementZones, ...state.draft.placementZones]
      .filter((area) => area.areaType === "spawn_area")
      .map((area) => ({ value: `area:${area.id}`, label: `敌人刷新区 · ${area.name || fallbackObjectName("区域", area.id)}` }))
    : [];
  return [...pointOptions, ...areaOptions];
}

function routeSourceValue(path) {
  const id = path.sourceBindingId || path.startPointId;
  if (!id) return "";
  return `${path.sourceBindingKind || "point"}:${id}`;
}

function renderRouteExecutionConfig(path) {
  const sources = routeSourceOptions(path);
  const sourceValue = routeSourceValue(path);
  const actorOptions = path.type === "movement_route"
    ? [
        ["source_all", "来源生成的全部敌人"],
        ["normal_enemy", "普通敌人"],
        ["elite_enemy", "精英敌人"],
        ["boss", "Boss"]
      ]
    : [
        ["player", "玩家"],
        ["hero", "英雄"],
        ["enemy", "指定敌人"],
        ["boss", "Boss"],
        ["npc", "NPC/过场角色"]
      ];
  const actorValue = path.actorScope || (path.type === "movement_route" ? "source_all" : "player");
  return `
    <div class="panel-title">路线执行关系</div>
    <p class="tool-hint">明确谁从哪个点位或刷新区开始执行当前路线。</p>
    <label class="tool-setting">
      执行来源
      <select data-route-field="source">
        <option value="">未绑定</option>
        ${sources.map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === sourceValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>
    <label class="tool-setting">
      执行角色
      <select data-route-field="actorScope">
        ${actorOptions.map(([value, label]) => `<option value="${value}" ${value === actorValue ? "selected" : ""}>${label}</option>`).join("")}
      </select>
    </label>
    ${path.type === "movement_route" ? `
      <label class="tool-setting">
        多路线分配
        <span class="tool-hint">同一执行来源连接多条移动路线时，决定符合条件的单位如何选路。</span>
        <select data-route-field="assignmentMode">
          <option value="all" ${(path.assignmentMode || "all") === "all" ? "selected" : ""}>固定走此路线</option>
          <option value="random" ${path.assignmentMode === "random" ? "selected" : ""}>在多条路线中随机分流</option>
        </select>
      </label>
    ` : `
      <label class="tool-setting">
        运行方式
        <select data-route-field="loopMode">
          <option value="once" ${(path.loopMode || "once") === "once" ? "selected" : ""}>单次</option>
          <option value="ping_pong" ${path.loopMode === "ping_pong" ? "selected" : ""}>往返</option>
          <option value="loop" ${path.loopMode === "loop" ? "selected" : ""}>循环</option>
        </select>
      </label>
    `}
  `;
}

function renderResourceStrip() {
  const backgroundActive = state.selectedCanvasEntity?.kind !== "asset";
  const backgroundLabel = state.map.backgroundName || "预置";
  const backgroundMedia = state.map.backgroundUrl
    ? `<img class="resource-thumb" src="${state.map.backgroundUrl}" alt="" />`
    : `<span>底图</span><small>${escapeHtml(backgroundLabel)}</small>`;
  const assets = (state.map.objects || [])
    .map(
      (object) => `
        <button class="resource-tile ${isSelectedCanvasEntity("asset", object.id) ? "active" : ""}" data-resource-kind="asset" data-asset-id="${object.id}">
          <img class="resource-thumb" src="${object.url}" alt="" />
          <span class="resource-name">${escapeHtml(object.name || object.fileName || "素材")}</span>
        </button>
      `
    )
    .join("");
  resourceStrip.innerHTML = `
    <label class="resource-tile add-resource">
      <input id="mapAssetInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple />
      <span class="material-symbols-rounded" aria-hidden="true">add_photo_alternate</span>
    </label>
    <div class="resource-tile background-resource ${backgroundActive ? "active" : ""}" data-resource-kind="background" role="button" tabindex="0">
      ${backgroundMedia}
      ${state.map.backgroundUrl ? `<span class="resource-name">底图</span>` : ""}
      <span class="resource-actions-hover">
        <span data-background-action="replace">更换</span>
        <button data-background-action="delete">删除</button>
      </span>
    </div>
    ${assets}
  `;
  const input = resourceStrip.querySelector("#mapAssetInput");
  if (input) input.addEventListener("change", handleMapAssetInputChange);
}

function renderBackgroundConfig() {
  return `
    <div class="panel-title">底图配置</div>
    <p class="tool-hint">底图是当前关卡的视觉基底；点位、路径、区域和素材对象都叠加在它上方。</p>
    <label class="tool-setting">
      关卡名称
      <input data-map-field="name" value="${escapeAttribute(state.map.name)}" />
    </label>
    <div class="selected-config-grid">
      <label class="tool-setting">
        宽度
        <input value="${state.map.width}" disabled />
      </label>
      <label class="tool-setting">
        高度
        <input value="${state.map.height}" disabled />
      </label>
    </div>
    <div class="asset-preview-chip">
      <span>当前底图：${escapeHtml(state.map.backgroundName || "默认关卡底图")}</span>
    </div>
    <button class="danger-action" data-config-action="clear-background">恢复默认底图</button>
  `;
}

function renderAssetConfig(object) {
  const instanceHint = state.selectedShooterInstanceId
    ? `<div class="asset-preview-chip"><span>已选中运行实例：${escapeHtml(state.selectedShooterInstanceId)}</span></div>`
    : "";
  return `
    <div class="panel-title">素材配置</div>
    <div class="asset-preview-chip">
      <img src="${object.url}" alt="" />
      <span>${escapeHtml(object.fileName || object.name)}</span>
    </div>
    ${instanceHint}
    <div class="asset-meta-grid">
      <label class="tool-setting">
        X
        <input value="${Math.round(object.x)}" disabled />
      </label>
      <label class="tool-setting">
        Y
        <input value="${Math.round(object.y)}" disabled />
      </label>
      <label class="tool-setting">
        缩放
        <input value="${Number(object.scale || 1).toFixed(2)}x" disabled />
      </label>
    </div>
    <div class="asset-layer-actions">
      <button data-layer-action="up">上一层</button>
      <button data-layer-action="down">下一层</button>
      <button data-layer-action="top">置顶</button>
      <button data-layer-action="bottom">置底</button>
    </div>
    ${state.gameType === "shooter" ? renderShooterAssetSettings(object) : ""}
    <div class="asset-brush-settings">
    <div class="panel-title">碰撞笔刷设置</div>
    <p class="tool-hint">选择移动、画笔或擦除，在预览上编辑当前素材的碰撞范围。</p>
    <label class="tool-setting">
      区域操作
      <div class="segmented-control asset-action-control">
        <button class="${state.assetCollisionAction === "brush" ? "active" : ""}" data-asset-collision-action="brush">画笔</button>
        <button class="${state.assetCollisionAction === "erase" ? "active" : ""}" data-asset-collision-action="erase">擦除</button>
      </div>
    </label>
    <label class="tool-setting">
      碰撞类型
      <div class="segmented-control collision-type-control">
        <button class="${object.blockingType === "movement" ? "active" : ""} brush-movement" data-asset-blocking-type="movement">移动</button>
        <button class="${object.blockingType === "projectile" ? "active" : ""} brush-projectile" data-asset-blocking-type="projectile">弹道</button>
        <button class="${object.blockingType === "vision" ? "active" : ""} brush-vision" data-asset-blocking-type="vision">视野</button>
        <button class="${object.blockingType === "all" ? "active" : ""} brush-all" data-asset-blocking-type="all">全部</button>
      </div>
    </label>
    <label class="tool-setting">
      笔刷大小
      <div class="range-row">
        <input data-asset-brush-size type="range" min="16" max="120" step="4" value="${state.brushSize}" />
        <span>${state.brushSize}</span>
      </div>
    </label>
    <button class="danger-action" data-config-action="clear-asset-collision">清空素材碰撞</button>
    </div>
    <p class="tool-hint">拖动画布中的素材移动；拖拽右下角手柄调整缩放；点击右上角 X 删除素材。碰撞笔刷只在素材范围内生效。</p>
  `;
}

function renderShooterAssetSettings(object) {
  return `
    <div class="asset-brush-settings shooter-asset-settings">
      <div class="panel-title">射击卷轴素材</div>
      <label class="tool-setting">
        出现方式
        <div class="segmented-control asset-spawn-control">
          <button class="${(object.spawnMode || "fixed") === "fixed" ? "active" : ""}" data-asset-spawn-mode="fixed">固定放置</button>
          <button class="${object.spawnMode === "scroll_random" ? "active" : ""}" data-asset-spawn-mode="scroll_random">随卷轴随机出现</button>
        </div>
      </label>
      <label class="tool-setting ${object.spawnMode === "scroll_random" ? "" : "hidden"}">
        出现密度
        <div class="segmented-control asset-density-control">
          <button class="${(object.spawnDensity || "medium") === "low" ? "active" : ""}" data-asset-density="low">低</button>
          <button class="${(object.spawnDensity || "medium") === "medium" ? "active" : ""}" data-asset-density="medium">中</button>
          <button class="${(object.spawnDensity || "medium") === "high" ? "active" : ""}" data-asset-density="high">高</button>
        </div>
      </label>
    </div>
  `;
}

function syncSemanticOptions(resetSelection) {
  const options = gameMapPresets[state.gameType][state.editObject];
  if (resetSelection || !options.some(([value]) => value === state.semanticType)) {
    state.semanticType = options[0][0];
  }
  semanticTypeButtons.innerHTML = options
    .map(
      ([value, label]) => {
        const color = semanticTypeColor(value);
        return `<button class="${value === state.semanticType ? "active" : ""}" data-semantic-type="${value}" style="--type-color:${color}">${label}</button>`;
      }
    )
    .join("");
  semanticTypeButtons.querySelectorAll("[data-semantic-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.semanticType = button.dataset.semanticType;
      clearSelectedObject();
      state.activeDraftPolyline = null;
      syncToolFromSemantic();
      updateToolSettings();
      semanticTypeButtons.querySelectorAll("button").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      renderAll();
    });
  });
  syncToolFromSemantic();
  updateToolSettings();
}

function syncToolFromSemantic() {
  if (state.editObject === "point") {
    state.tool = "point";
    return;
  }
  if (state.editObject === "path") {
    state.tool = "path";
    return;
  }
  state.tool = "area";
  if (state.semanticType === "projectile_block") state.blockingType = "projectile";
  if (state.semanticType === "vision_block") state.blockingType = "vision";
  if (["forbidden_area", "activity_boundary"].includes(state.semanticType)) state.blockingType = "movement";
  blockingTypeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.blockingType === state.blockingType);
  });
}

function collisionSemanticType(type) {
  return ["collision", "projectile_block", "vision_block", "forbidden_area", "activity_boundary"].includes(type);
}

function renderAll() {
  renderResourceStrip();
  renderMap();
  renderPreview();
  renderObjectList();
  renderSelectedConfig();
  renderDraftStatus();
}

function drawScene(ctx, width, height) {
  const mapBackground = state.map.backgroundUrl ? cacheImage(state.map.backgroundUrl) : mapBackgrounds[state.currentMapId] || mapBackgrounds["hulao-entry"];
  if (mapBackground?.complete && mapBackground.naturalWidth) {
    if (state.map.motion === "scroll" && state.simulation.unitTravelEnabled) {
      drawScrollingBackground(ctx, mapBackground, width, height);
      return;
    }
    drawImageCover(ctx, mapBackground, 0, 0, width, height);
    return;
  }

  const sky = ctx.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, "#dcc180");
  sky.addColorStop(0.45, "#bd9860");
  sky.addColorStop(1, "#7ea0a6");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#eee0b3";
  ctx.lineWidth = 42;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(width * 0.18, height * 0.05);
  ctx.bezierCurveTo(width * 0.72, height * 0.18, width * 0.24, height * 0.42, width * 0.68, height * 0.58);
  ctx.bezierCurveTo(width * 0.92, height * 0.69, width * 0.34, height * 0.77, width * 0.46, height * 0.96);
  ctx.stroke();

  ctx.strokeStyle = "#a77a46";
  ctx.lineWidth = 4;
  ctx.stroke();

  for (let i = 0; i < 16; i += 1) {
    const x = (i * 97) % width;
    const y = (i * 151) % height;
    ctx.fillStyle = i % 2 ? "#7d6b48" : "#4f7753";
    ctx.beginPath();
    ctx.arc(x, y, 12 + (i % 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawScrollingBackground(ctx, image, width, height) {
  const direction = currentScrollDirection();
  const offset = state.simulation.scrollOffset || 0;
  if (direction === "horizontal") {
    const x = -(offset % width);
    drawImageCover(ctx, image, x, 0, width, height);
    drawImageCover(ctx, image, x + width, 0, width, height);
    return;
  }
  const y = offset % height;
  drawImageCover(ctx, image, 0, y, width, height);
  drawImageCover(ctx, image, 0, y - height, width, height);
}

function drawImageCover(ctx, image, x, y, width, height) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else if (sourceRatio < targetRatio) {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawMapAssets(ctx, options = {}) {
  const objects = [...(state.map.objects || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  objects.forEach((object) => {
    if (options.hideScrollRandom && object.spawnMode === "scroll_random") return;
    const bounds = assetBounds(object);
    const image = assetImageForObject(object);
    ctx.save();
    ctx.translate(object.x, object.y);
    ctx.rotate(((object.rotation || 0) * Math.PI) / 180);
    if (image?.complete && image.naturalWidth) {
      ctx.drawImage(image, -bounds.w / 2, -bounds.h / 2, bounds.w, bounds.h);
    } else {
      ctx.fillStyle = "#dbeafe";
      ctx.strokeStyle = "#3b82f6";
      ctx.fillRect(-bounds.w / 2, -bounds.h / 2, bounds.w, bounds.h);
      ctx.strokeRect(-bounds.w / 2, -bounds.h / 2, bounds.w, bounds.h);
    }
    ctx.restore();
    drawAssetCollision(ctx, object);
    if (isSelectedCanvasEntity("asset", object.id)) drawSelectedAssetOutline(ctx, object);
  });
}

function shouldHideScrollRandomSourceAssets() {
  return (
    state.gameType === "shooter" &&
    state.simulation.unitTravelEnabled &&
    state.simulation.shooterAssetInstances.length > 0
  );
}

function assetImageForObject(object) {
  if (object.playback === "sequence" && object.frames?.length > 1) {
    const fps = Math.max(1, object.fps || 8);
    const frame = Math.floor((performance.now() / 1000) * fps) % object.frames.length;
    return cacheImage(object.frames[frame]);
  }
  return cacheImage(object.url);
}

function drawSelectedAssetOutline(ctx, object) {
  const bounds = assetBounds(object);
  ctx.save();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.w + 10, bounds.h + 10);
  ctx.setLineDash([]);

  const deleteHandle = assetDeleteHandle(object);
  ctx.fillStyle = "#ef4444";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(deleteHandle.x, deleteHandle.y, deleteHandle.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(deleteHandle.x - 5, deleteHandle.y - 5);
  ctx.lineTo(deleteHandle.x + 5, deleteHandle.y + 5);
  ctx.moveTo(deleteHandle.x + 5, deleteHandle.y - 5);
  ctx.lineTo(deleteHandle.x - 5, deleteHandle.y + 5);
  ctx.stroke();

  const resizeHandle = assetResizeHandle(object);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(resizeHandle.x - resizeHandle.r, resizeHandle.y - resizeHandle.r, resizeHandle.r * 2, resizeHandle.r * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAssetCollision(ctx, object) {
  const marks = assetCollisionMarks(object);
  if (!marks.length) return;
  ctx.save();
  ctx.lineWidth = 1.5;
  marks.forEach((mark) => {
    const color = collisionColors[mark.blockingType || object.blockingType] || collisionColors.movement;
    ctx.fillStyle = withAlpha(color, 0.14);
    ctx.strokeStyle = withAlpha(color, 0.72);
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, mark.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function renderMap() {
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  drawScene(mapCtx, mapCanvas.width, mapCanvas.height);
  drawMapAssets(mapCtx);
  drawObjects(mapCtx, 1);
}

function renderPreview() {
  if (!state.previewHasContent) {
    drawEmptyPreview();
    return;
  }
  if (state.activeView === "gameplay") {
    drawGameplayPreview();
    return;
  }
  updatePlayer();
  updateSimulation();
  updateBalanceTest();
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  const sx = previewCanvas.width / mapCanvas.width;
  const sy = previewCanvas.height / mapCanvas.height;
  previewCtx.save();
  previewCtx.scale(sx, sy);
  drawScene(previewCtx, mapCanvas.width, mapCanvas.height);
  drawMapAssets(previewCtx, { hideScrollRandom: shouldHideScrollRandomSourceAssets() });
  drawObjects(previewCtx, 1);
  drawSimulationUnits(previewCtx);
  drawTestPlayer(previewCtx);
  previewCtx.restore();

  previewCtx.fillStyle = "rgba(14, 18, 26, 0.86)";
  previewCtx.fillRect(0, 0, previewCanvas.width, 54);
  previewCtx.fillStyle = "#fff";
  previewCtx.font = "bold 15px sans-serif";
  previewCtx.fillText("地图编辑同步预览", 18, 33);
  previewCtx.font = "12px sans-serif";
  previewCtx.fillText("测试角色：WASD/方向键移动", 18, 50);
  drawBalanceTestPreview();
}

function drawEmptyPreview() {
  previewCtx.save();
  previewCtx.setTransform(1, 0, 0, 1, 0, 0);
  previewCtx.fillStyle = "#000";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.restore();
}

function drawBalanceTestPreview() {
  const test = state.balanceTest;
  if (!test || test.status === "idle") return;
  const profile = activeBalanceProfile();
  const wave = profile.data.waves[test.waveIndex];
  const sx = previewCanvas.width / mapCanvas.width;
  const sy = previewCanvas.height / mapCanvas.height;
  const route = balancePreviewRoute();

  previewCtx.save();
  previewCtx.scale(sx, sy);
  previewCtx.lineWidth = 8;
  previewCtx.lineCap = "round";
  previewCtx.strokeStyle = "rgba(37, 99, 235, 0.45)";
  previewCtx.beginPath();
  route.forEach((point, index) => {
    if (index === 0) previewCtx.moveTo(point.x, point.y);
    else previewCtx.lineTo(point.x, point.y);
  });
  previewCtx.stroke();

  test.visualEnemies.forEach((enemy) => {
    const point = pointOnRoute(route, enemy.progress);
    if (!point) return;
    const offset = (enemy.lane - 1.5) * 10;
    previewCtx.fillStyle = enemy.boss ? "#a855f7" : "#ef4444";
    previewCtx.strokeStyle = "#fff";
    previewCtx.lineWidth = 3;
    previewCtx.beginPath();
    previewCtx.arc(point.x + offset, point.y - offset, enemy.boss ? 18 : 11, 0, Math.PI * 2);
    previewCtx.fill();
    previewCtx.stroke();
  });
  previewCtx.restore();

  const panelY = 66;
  previewCtx.fillStyle = "rgba(15, 23, 42, 0.84)";
  roundRect(previewCtx, 16, panelY, previewCanvas.width - 32, 118, 14);
  previewCtx.fill();
  previewCtx.fillStyle = "#fff";
  previewCtx.font = "bold 18px sans-serif";
  previewCtx.fillText(test.status === "running" ? `平衡性试跑：${wave?.name || "结算"}` : `试跑完成：${test.conclusion}`, 34, panelY + 32);
  previewCtx.font = "13px sans-serif";
  previewCtx.fillStyle = "#cbd5e1";
  previewCtx.fillText(`来源：${test.source}  速度：${test.speed}x`, 34, panelY + 56);
  previewCtx.fillStyle = "#fff";
  previewCtx.font = "bold 14px sans-serif";
  previewCtx.fillText(`基地 ${Math.round(test.baseHp)} / 金币 ${Math.round(test.gold)} / 漏怪 ${test.leaked} / 击杀 ${test.kills}`, 34, panelY + 84);
  const progress = test.status === "running" ? Math.min(1, test.waveTime / Math.max(1, test.waveDuration)) : 1;
  previewCtx.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(previewCtx, 34, panelY + 98, previewCanvas.width - 68, 8, 4);
  previewCtx.fill();
  previewCtx.fillStyle = test.status === "finished" ? "#22c55e" : "#60a5fa";
  roundRect(previewCtx, 34, panelY + 98, (previewCanvas.width - 68) * progress, 8, 4);
  previewCtx.fill();
}

function balancePreviewRoute() {
  const path = mergedMapData().paths.find((item) => ["movement_route", "main"].includes(item.type) && item.points?.length > 1);
  if (path) return path.points;
  return [
    { x: MAP_WIDTH * 0.18, y: MAP_HEIGHT * 0.05 },
    { x: MAP_WIDTH * 0.72, y: MAP_HEIGHT * 0.18 },
    { x: MAP_WIDTH * 0.24, y: MAP_HEIGHT * 0.42 },
    { x: MAP_WIDTH * 0.68, y: MAP_HEIGHT * 0.58 },
    { x: MAP_WIDTH * 0.46, y: MAP_HEIGHT * 0.96 }
  ];
}

function pointOnRoute(route, rawProgress) {
  const progress = Math.max(0, Math.min(1, rawProgress));
  if (!route.length) return null;
  if (route.length === 1) return route[0];
  const lengths = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    const length = distance(route[i], route[i + 1]);
    lengths.push(length);
    total += length;
  }
  let target = total * progress;
  for (let i = 0; i < lengths.length; i += 1) {
    if (target > lengths[i]) {
      target -= lengths[i];
      continue;
    }
    const ratio = lengths[i] ? target / lengths[i] : 0;
    return {
      x: route[i].x + (route[i + 1].x - route[i].x) * ratio,
      y: route[i].y + (route[i + 1].y - route[i].y) * ratio
    };
  }
  return route[route.length - 1];
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

const miniGameUi = {
  fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  font: {
    display: 48,
    title: 32,
    body: 24,
    label: 20,
    caption: 18,
    micro: 16
  },
  space: {
    xs: 8,
    sm: 12,
    md: 20,
    lg: 28,
    xl: 36
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    pill: 999
  },
  entity: {
    buildPoint: 28,
    buildPointActive: 34,
    enemy: 18,
    tower: 30,
    heroWidth: 38,
    heroHeight: 54,
    base: 64
  },
  color: {
    panel: "rgba(15, 23, 42, 0.9)",
    panelSoft: "rgba(255, 255, 255, 0.94)",
    card: "#fff7ed",
    cardActive: "#ecfdf5",
    line: "rgba(15, 23, 42, 0.12)",
    text: "#111827",
    textOnDark: "#ffffff",
    muted: "#64748b",
    mutedOnDark: "#cbd5e1",
    accent: "#14b8a6",
    accentDark: "#0f766e",
    warning: "#f59e0b",
    danger: "#ef4444",
    success: "#22c55e",
    info: "#2563eb"
  }
};

function miniGameFont(size, weight = 600) {
  return `${weight} ${size}px ${miniGameUi.fontFamily}`;
}

function drawMiniGamePanel(ctx, x, y, width, height, options = {}) {
  const {
    radius = miniGameUi.radius.md,
    fill = miniGameUi.color.panelSoft,
    stroke = miniGameUi.color.line,
    lineWidth = 1,
    shadow = false
  } = options;
  ctx.save();
  if (shadow) {
    ctx.shadowColor = "rgba(15, 23, 42, 0.12)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
  }
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMiniGameMetric(ctx, label, value, x, y, width, options = {}) {
  const dark = options.dark !== false;
  const height = options.height || 58;
  drawMiniGamePanel(ctx, x, y, width, height, {
    radius: miniGameUi.radius.sm,
    fill: dark ? "rgba(255, 255, 255, 0.1)" : "rgba(248, 250, 252, 0.94)",
    stroke: dark ? "rgba(255,255,255,0.06)" : "#e5e7eb"
  });
  ctx.fillStyle = dark ? "#94a3b8" : miniGameUi.color.muted;
  ctx.font = miniGameFont(miniGameUi.font.caption, 600);
  ctx.fillText(miniGameEllipsis(ctx, label, width - 24), x + 12, y + 22);
  ctx.fillStyle = dark ? miniGameUi.color.textOnDark : miniGameUi.color.text;
  ctx.font = miniGameFont(miniGameUi.font.body, 800);
  ctx.fillText(miniGameEllipsis(ctx, String(value), width - 24), x + 12, y + 48);
}

function miniGameEllipsis(ctx, text, maxWidth) {
  const value = String(text);
  if (ctx.measureText(value).width <= maxWidth) return value;
  let next = value;
  while (next.length > 1 && ctx.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}...`;
}

function drawMiniGameLabel(ctx, text, x, y, options = {}) {
  const {
    align = "center",
    fill = "rgba(255, 255, 255, 0.94)",
    stroke = "#e5e7eb",
    color = miniGameUi.color.text,
    maxWidth = 136,
    height = 30,
    radius = miniGameUi.radius.sm,
    minChars = 0
  } = options;
  ctx.save();
  const fontSize = options.fontSize || miniGameUi.font.label;
  const resolvedHeight = Math.max(height, fontSize + 12);
  ctx.font = miniGameFont(fontSize, 800);
  const pad = Math.max(10, Math.round(fontSize * 0.7));
  const readableWidth = minChars ? Math.ceil(fontSize * minChars + pad * 2) : 0;
  const resolvedMaxWidth = Math.max(maxWidth, readableWidth);
  const label = miniGameEllipsis(ctx, text, resolvedMaxWidth - pad * 2);
  const width = Math.min(resolvedMaxWidth, Math.max(58, ctx.measureText(label).width + pad * 2, readableWidth));
  const left = align === "left" ? x : align === "right" ? x - width : x - width / 2;
  drawMiniGamePanel(ctx, left, y, width, resolvedHeight, { radius, fill, stroke });
  ctx.fillStyle = color;
  ctx.fillText(label, left + pad, y + Math.round(resolvedHeight * 0.68));
  ctx.restore();
  return { x: left, y, width, height: resolvedHeight };
}

function drawMiniGameHealthBar(ctx, x, y, width, value, maxValue, options = {}) {
  const height = options.height || 6;
  const ratio = clamp(maxValue ? value / maxValue : 0, 0, 1);
  drawMiniGamePanel(ctx, x, y, width, height, {
    radius: height / 2,
    fill: options.track || "rgba(15, 23, 42, 0.24)",
    stroke: null
  });
  drawMiniGamePanel(ctx, x, y, width * ratio, height, {
    radius: height / 2,
    fill: options.fill || miniGameUi.color.success,
    stroke: null
  });
}

function drawMiniGameActionCard(ctx, slot, card, options = {}) {
  ctx.save();
  const active = Boolean(options.active);
  const tone = options.tone || "orange";
  const palette = {
    orange: { fill: "#fff7ed", stroke: miniGameUi.color.warning, meta: "#7c2d12" },
    blue: { fill: "#eff6ff", stroke: miniGameUi.color.info, meta: "#1e3a8a" },
    green: { fill: "#ecfdf5", stroke: miniGameUi.color.success, meta: "#047857" },
    slate: { fill: "#f8fafc", stroke: "#cbd5e1", meta: miniGameUi.color.muted }
  }[tone] || { fill: "#f8fafc", stroke: "#cbd5e1", meta: miniGameUi.color.muted };
  drawMiniGamePanel(ctx, slot.x, slot.y, slot.width, slot.height, {
    radius: miniGameUi.radius.md,
    fill: active ? miniGameUi.color.cardActive : palette.fill,
    stroke: active ? miniGameUi.color.success : palette.stroke,
    lineWidth: active ? 3 : 2,
    shadow: true
  });
  const pad = options.pad || 14;
  ctx.fillStyle = miniGameUi.color.text;
  const titleSize = options.titleSize || miniGameUi.font.body;
  ctx.font = miniGameFont(titleSize, 800);
  wrapCanvasText(ctx, card.title || card.name, slot.x + pad, slot.y + (options.titleY || 38), slot.width - pad * 2, options.titleLineHeight || Math.round(titleSize * 1.2), options.titleMaxLines || 2);
  if (card.meta) {
    ctx.fillStyle = palette.meta;
    ctx.font = miniGameFont(options.metaSize || miniGameUi.font.caption, 700);
    ctx.fillText(miniGameEllipsis(ctx, card.meta, slot.width - pad * 2), slot.x + pad, slot.y + (options.metaY || 78));
  }
  if (card.detail) {
    ctx.fillStyle = options.detailColor || miniGameUi.color.muted;
    ctx.font = miniGameFont(options.detailSize || miniGameUi.font.caption, 600);
    wrapCanvasText(ctx, card.detail, slot.x + pad, slot.y + (options.detailY || 108), slot.width - pad * 2, options.detailLineHeight || 22, options.detailMaxLines || 3);
  }
  ctx.restore();
}

function normalizeMiniGameMessage(message) {
  return String(message || "").replace(/^试玩[:：]\s*/, "").trim();
}

function miniGameNoticeContent(message) {
  const body = normalizeMiniGameMessage(message);
  if (!body) return null;
  if (/失败|不足|无法|不能|倒下|摧毁|攻破|认输/.test(body)) {
    return { title: "需要处理", body, tone: "danger" };
  }
  if (/通关|完成|成功|胜利|守住/.test(body)) {
    return { title: "目标达成", body, tone: "success" };
  }
  if (/选择|先选|等待|开始/.test(body)) {
    return { title: "等待操作", body, tone: "info" };
  }
  if (/已|获得|奖励|生效|升级|建造|释放/.test(body)) {
    return { title: "规则更新", body, tone: "success" };
  }
  return { title: "试玩提示", body, tone: "neutral" };
}

function miniGameToneColor(tone) {
  return {
    danger: miniGameUi.color.danger,
    success: miniGameUi.color.success,
    info: miniGameUi.color.info,
    warning: miniGameUi.color.warning,
    neutral: miniGameUi.color.accent
  }[tone] || miniGameUi.color.accent;
}

function drawMiniGameToast(ctx, message, options = {}) {
  const notice = miniGameNoticeContent(message);
  if (!notice) return;
  const x = options.x ?? 44;
  const y = options.y ?? MAP_HEIGHT - 132;
  const width = options.width ?? MAP_WIDTH - 88;
  const height = options.height ?? 82;
  const tone = miniGameToneColor(notice.tone);
  drawMiniGamePanel(ctx, x, y, width, height, {
    radius: miniGameUi.radius.lg,
    fill: "rgba(255, 255, 255, 0.94)",
    stroke: "rgba(15, 23, 42, 0.12)",
    shadow: true
  });
  ctx.fillStyle = tone;
  roundRect(ctx, x + 14, y + 16, 6, height - 32, 3);
  ctx.fill();
  ctx.fillStyle = tone;
  ctx.font = miniGameFont(miniGameUi.font.caption, 800);
  ctx.fillText(notice.title, x + 34, y + 32);
  ctx.fillStyle = miniGameUi.color.text;
  ctx.font = miniGameFont(miniGameUi.font.label, 700);
  wrapCanvasText(ctx, notice.body, x + 34, y + 60, width - 64, 24, 1);
}

function drawObjects(ctx) {
  drawObjectSet(ctx, state.map, false);
  drawObjectSet(ctx, state.draft, true);
  drawActiveAreaStroke(ctx);
  drawActivePolyline(ctx);
  drawLassoPreview(ctx);
}

function drawActiveAreaStroke(ctx) {
  if (!state.activeAreaStroke) return;
  const zone = state.activeAreaStroke;
  const color = collisionSemanticType(zone.semanticType) ? collisionColors[zone.blockingType] || collisionColors.all : areaColor(zone.areaType);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = withAlpha(color, 0.2);
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  if (collisionSemanticType(zone.semanticType)) drawCollisionShape(ctx, zone, color, true);
  else drawAreaShape(ctx, zone, color, true);
  ctx.restore();
}

function drawActivePolyline(ctx) {
  if (!state.activeDraftPolyline || state.activeDraftPolyline.points.length < 1) return;
  ctx.save();
  const color = pathColor(state.activeDraftPolyline.type);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = state.pathWidth;
  ctx.setLineDash([8, 6]);
  const points = state.activeDraftPolyline.points;
  if (points.length > 1) drawPathLine(ctx, state.activeDraftPolyline);
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawObjectSet(ctx, data, isDraft) {
  const source = isDraft ? "draft" : "map";
  data.paths.forEach((path) => {
    if (path.kind === "shooter_route_rule") return;
    if (path.points.length < 2) return;
    const selected = isSelectedObject(path.id, "paths", source);
    const color = pathColor(path.type);
    ctx.strokeStyle = color;
    ctx.lineWidth = selected ? (path.width || 5) + 8 : path.width || (isDraft ? 5 : 3);
    ctx.setLineDash(isDraft ? [10, 8] : []);
    if (selected) {
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 10;
    }
    drawPathLine(ctx, path);
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
  });

  data.collisionZones.forEach((zone) => {
    const selected = isSelectedZone(zone, "collisionZones", source);
    const color = collisionColors[zone.blockingType] || collisionColors.all;
    ctx.strokeStyle = color;
    ctx.lineWidth = selected ? 6 : isDraft ? 3 : 2;
    ctx.setLineDash(isDraft ? [8, 6] : []);
    drawCollisionShape(ctx, zone, color, isDraft);
    if (selected) drawSelectedZoneOutline(ctx, zone);
    ctx.setLineDash([]);
  });

  data.placementZones.forEach((zone) => {
    const selected = isSelectedZone(zone, "placementZones", source);
    const color = areaColor(zone.areaType);
    ctx.fillStyle = withAlpha(color, isDraft ? 0.22 : 0.16);
    ctx.strokeStyle = color;
    ctx.lineWidth = selected ? 6 : isDraft ? 3 : 2;
    ctx.setLineDash(isDraft ? [8, 6] : []);
    drawAreaShape(ctx, zone, color, isDraft);
    if (selected) drawSelectedZoneOutline(ctx, zone);
    ctx.setLineDash([]);
  });

  data.points.forEach((point) => {
    const selected = isSelectedObject(point.id, "points", source);
    ctx.fillStyle = pointColor(point.type);
    ctx.strokeStyle = selected ? "#f59e0b" : "#fff";
    ctx.lineWidth = selected ? 6 : isDraft ? 4 : 3;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.type === "tower_core" ? 16 : 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#152033";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(semanticLabel(point.type), point.x + 14, point.y + 4);
  });
}

function semanticTypeColor(type) {
  if (state.editObject === "point") return pointColor(type);
  if (state.editObject === "area") return areaColor(type);
  return pathColor(type);
}

function pathColor(type) {
  return type === "patrol_route" ? "#0d9488" : "#8b5cf6";
}

function pointColor(type) {
  return pointColors[type] || "#2979ff";
}

function drawPathLine(ctx, path) {
  if (path.drawMode === "curve") {
    drawSmoothPath(ctx, path.points);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(path.points[0].x, path.points[0].y);
  path.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
}

function drawSmoothPath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    return;
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const mid = {
      x: (current.x + next.x) / 2,
      y: (current.y + next.y) / 2
    };
    ctx.quadraticCurveTo(current.x, current.y, mid.x, mid.y);
  }
  const penultimate = points[points.length - 2];
  const last = points[points.length - 1];
  ctx.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
  ctx.stroke();
}

function drawAreaShape(ctx, zone, color, isDraft) {
  if (zone.shape === "brush") {
    drawBrushShape(ctx, zone, color, isDraft);
    drawObstacleCollisionMarks(ctx, zone, color);
    return;
  }
  if (zone.shape === "circle") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.clip();
    drawHatchPattern(ctx, zoneBounds(zone), color, isDraft);
    ctx.restore();
    drawObstacleCollisionMarks(ctx, zone, color);
    return;
  }
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
  drawObstacleCollisionMarks(ctx, zone, color);
}

function drawObstacleCollisionMarks(ctx, zone, color) {
  if (zone.areaType !== "obstacle_zone") return;
  const marks = obstacleCollisionMarks(zone);
  if (!marks.length) return;
  ctx.save();
  ctx.fillStyle = withAlpha(color, zone.collisionMark === "auto" ? 0.16 : 0.11);
  ctx.strokeStyle = withAlpha("#0f172a", 0.34);
  ctx.lineWidth = 1.5;
  marks.forEach((mark) => {
    const r = Math.max(7, Math.min(18, mark.r || 10));
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawSelectedZoneOutline(ctx, zone) {
  ctx.save();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 6;
  ctx.setLineDash([]);
  if (zone.shape === "brush") {
    createBrushPath(ctx, {
      ...zone,
      stamps: zone.stamps.map((stamp) => ({ ...stamp, r: stamp.r + 3 }))
    });
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (zone.shape === "circle") {
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const bounds = zoneBounds(zone);
  ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
  ctx.restore();
}

function areaColor(type) {
  return areaColors[type] || "#1ca672";
}

function drawCollisionShape(ctx, zone, color, isDraft) {
  if (zone.shape === "brush") {
    drawBrushShape(ctx, zone, color, isDraft);
    return;
  }
  ctx.save();
  createCollisionPath(ctx, zone);
  ctx.clip();
  drawHatchPattern(ctx, zoneBounds(zone), color, isDraft);
  ctx.restore();

  ctx.save();
  createCollisionPath(ctx, zone);
  ctx.strokeStyle = color;
  ctx.globalAlpha = isDraft ? 0.88 : 0.72;
  ctx.stroke();
  ctx.restore();
}

function drawBrushShape(ctx, zone, color, isDraft) {
  ctx.save();
  createBrushPath(ctx, zone);
  ctx.fillStyle = withAlpha(color, isDraft ? 0.12 : 0.09);
  ctx.strokeStyle = withAlpha(color, isDraft ? 0.72 : 0.52);
  ctx.lineWidth = isDraft ? 1.8 : 1.4;
  ctx.fill();
  ctx.stroke();
  ctx.clip();
  drawHatchPattern(ctx, zoneBounds(zone), color, isDraft, 0.16);
  ctx.restore();
}

function createBrushPath(ctx, zone) {
  ctx.beginPath();
  zone.stamps.forEach((stamp) => {
    ctx.moveTo(stamp.x + stamp.r, stamp.y);
    ctx.arc(stamp.x, stamp.y, stamp.r, 0, Math.PI * 2);
  });
}

function createCollisionPath(ctx, zone) {
  ctx.beginPath();
  if (zone.shape === "circle") {
    ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
    return;
  }
  if (zone.shape === "polygon") {
    if (!zone.points.length) return;
    ctx.moveTo(zone.points[0].x, zone.points[0].y);
    zone.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    return;
  }
  ctx.rect(zone.x, zone.y, zone.w, zone.h);
}

function drawHatchPattern(ctx, bounds, color, isDraft, alphaOverride) {
  const spacing = 18;
  const overscan = Math.max(bounds.w, bounds.h) + 40;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alphaOverride ?? (isDraft ? 0.42 : 0.28);
  ctx.lineWidth = alphaOverride ? 1.1 : isDraft ? 1.8 : 1.4;
  ctx.setLineDash([]);
  for (let x = bounds.x - overscan; x < bounds.x + bounds.w + overscan; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, bounds.y + bounds.h + 20);
    ctx.lineTo(x + overscan, bounds.y - 20);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLassoPreview(ctx) {
  if (!state.lassoPoints.length || state.tool !== "area") return;
  ctx.save();
  ctx.strokeStyle = collisionColors[state.blockingType];
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  drawPolygon(ctx, state.lassoPoints, false);
  ctx.stroke();
  ctx.restore();
}

function drawTestPlayer(ctx) {
  ctx.save();
  ctx.fillStyle = state.player.blocked ? "#ef4444" : "#22c55e";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#152033";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("测试角色", state.player.x + 18, state.player.y + 4);
  ctx.restore();
}

function drawPolygon(ctx, points, closePath = true) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  if (closePath) ctx.closePath();
}

function withAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderObjectList() {
  const rows = currentObjectRows();
  if (!rows.length) {
    objectList.innerHTML = `<div class="object-empty">暂无${editObjectLabel()}，可在预览中添加。</div>`;
    return;
  }
  objectList.innerHTML = rows
    .map(
      ({ type, id, meta, bucket, source, display }) => `
        <div class="object-row ${isSelectedObject(id, bucket, source) ? "selected" : ""}" data-select-object="${id}" data-select-bucket="${bucket}" data-select-source="${source}">
          ${display || `<strong>${type}</strong><div>${id}</div><span>${meta}</span>`}
          <button data-delete-object="${id}" data-delete-bucket="${bucket}" data-delete-source="${source}">删除</button>
        </div>
      `
    )
    .join("");
  objectList.querySelectorAll("[data-delete-object]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteObjectFromList(button.dataset.deleteObject, button.dataset.deleteBucket, button.dataset.deleteSource);
    });
  });
  objectList.querySelectorAll("[data-select-object]").forEach((row) => {
    row.addEventListener("click", () => {
      selectObject(row.dataset.selectObject, row.dataset.selectBucket, row.dataset.selectSource);
    });
  });
}

function currentObjectRows() {
  if (state.editObject === "point") {
    return [
      ...state.map.points.map((item) => pointObjectRow(item, "map")),
      ...state.draft.points.map((item) => pointObjectRow(item, "draft"))
    ];
  }
  if (state.editObject === "path") {
    return [
      ...state.map.paths.map((item) => pathObjectRow(item, "map")),
      ...state.draft.paths.map((item) => pathObjectRow(item, "draft"))
    ];
  }
  return [
    ...areaObjectRows(state.map.collisionZones, "collisionZones", "map", "已应用 区域"),
    ...areaObjectRows(state.map.placementZones, "placementZones", "map", "已应用 区域"),
    ...areaObjectRows(state.draft.collisionZones, "collisionZones", "draft", "草稿 区域"),
    ...areaObjectRows(state.draft.placementZones, "placementZones", "draft", "草稿 区域")
  ];
}

function objectRow(type, item, meta, bucket, source) {
  return { type, id: item.id, meta, bucket, source };
}

function areaObjectRows(items, bucket, source, type) {
  const rows = [];
  const legacyGroups = new Map();
  items.forEach((item) => {
    if (item.shape === "circle") {
      const key = legacyAreaGroupId(item, bucket, source);
      if (!legacyGroups.has(key)) legacyGroups.set(key, []);
      legacyGroups.get(key).push(item);
      return;
    }
    rows.push(areaObjectRow(type, item, bucket, source));
  });
  legacyGroups.forEach((groupItems, key) => {
    const first = groupItems[0];
    rows.push(areaObjectRow(type, first, bucket, source, key, `合并笔刷 ${groupItems.length}点`));
  });
  return rows;
}

function areaMeta(item) {
  if (item.semanticType) return `${semanticLabel(item.semanticType)} / ${collisionMeta(item)}`;
  if (item.areaType === "obstacle_zone") {
    const markCount = obstacleCollisionMarks(item).length;
    return `${item.obstacleAsset || "默认障碍"} / ${obstacleCollisionMarkLabel(item.collisionMark)} ${markCount}点 / ${obstacleMovementLabel(item.movement)} / ${frequencyLabel(item.frequency)} / ${obstacleCollisionRuleLabel(item.collisionRule)}`;
  }
  if (item.shape === "brush") return `${semanticLabel(item.areaType)} / 单笔笔刷 ${item.stamps.length}点`;
  return semanticLabel(item.areaType) || item.allowedTypes.join("/");
}

function obstacleMovementLabel(value) {
  return {
    scroll: "随背景滚动",
    drift: "独立漂移",
    fixed: "固定悬浮",
    ai_random: "AI随机"
  }[value] || value || "随背景滚动";
}

function obstacleCollisionMarkLabel(value) {
  return {
    brush: "笔刷碰撞",
    auto: "自动识别"
  }[value] || "笔刷碰撞";
}

function obstacleCollisionRuleLabel(value) {
  return {
    player: "阻挡玩家",
    projectile: "阻挡子弹",
    all: "全部阻挡"
  }[value] || value || "阻挡玩家";
}

function areaTypeLabel(item) {
  if (item.semanticType) {
    const label = {
      movement: "移动",
      projectile: "弹道",
      vision: "视野",
      all: "全部"
    }[item.blockingType];
    return `${semanticLabel(item.semanticType)} / ${label}`;
  }
  return semanticLabel(item.areaType) || item.allowedTypes?.join("/") || "区域";
}

function legacyAreaGroupId(item, bucket, source) {
  if (item.shape !== "circle") return item.id;
  const type = item.semanticType || item.areaType || "area";
  const mode = item.blockingType || item.allowedTypes?.join("_") || "default";
  const radius = Math.round(item.r || item.brushSize / 2 || 0);
  return `group:${source}:${bucket}:${type}:${mode}:${radius}`;
}

function isLegacyAreaGroupKey(id) {
  return id.startsWith("group:");
}

function pointObjectRow(point, source) {
  const typeLabel = semanticLabel(point.type);
  const name = point.name || fallbackPointName(point);
  const coords = `x:${Math.round(point.x)}, y:${Math.round(point.y)}`;
  return {
    type: `${source === "map" ? "已应用" : "草稿"} 点位`,
    id: point.id,
    meta: `${typeLabel} - ${name} - ${coords}`,
    bucket: "points",
    source,
    display: objectLineDisplay(pointColor(point.type), `${typeLabel} - ${name} - ${coords}`)
  };
}

function pathObjectRow(path, source) {
  const typeLabel = semanticLabel(path.type);
  const name = path.name || fallbackObjectName("路线", path.id);
  const meta = pathMeta(path);
  return {
    type: `${source === "map" ? "已应用" : "草稿"} 路线`,
    id: path.id,
    meta: `${typeLabel} - ${name} - ${meta}`,
    bucket: "paths",
    source,
    display: objectLineDisplay(pathColor(path.type), `${typeLabel} - ${name} - ${meta}`)
  };
}

function areaObjectRow(type, item, bucket, source, id = item.id, customMeta) {
  const typeLabel = item.semanticType ? semanticLabel(item.semanticType) : semanticLabel(item.areaType);
  const name = item.name || fallbackObjectName("区域", id);
  const meta = customMeta || areaMeta(item);
  return {
    type,
    id,
    meta: `${typeLabel} - ${name} - ${meta}`,
    bucket,
    source,
    display: objectLineDisplay(areaObjectColor(item), `${typeLabel} - ${name} - ${meta}`)
  };
}

function objectLineDisplay(color, text) {
  return `<span class="object-row-line"><i style="--object-color:${color}"></i>${text}</span>`;
}

function fallbackPointName(point) {
  return `点位${point.id.slice(-4).toUpperCase()}`;
}

function fallbackObjectName(prefix, id) {
  return `${prefix}${id.slice(-4).toUpperCase()}`;
}

function areaObjectColor(item) {
  if (item.semanticType) return collisionColors[item.blockingType] || collisionColors.all;
  return areaColor(item.areaType);
}

function pathMeta(path) {
  if (path.kind === "shooter_route_rule") {
    return `${entryLabel(path.entry)} / ${movementLabel(path.movement)} / ${formationLabel(path.formation)} / ${frequencyLabel(path.frequency)}`;
  }
  const mode = path.drawMode === "curve" ? "曲线" : "折线";
  const start = findPointById(path.startPointId);
  const end = findPointById(path.endPointId);
  const binding = start || end
    ? ` / ${start ? semanticLabel(start.type) : "未绑定起点"} → ${end ? semanticLabel(end.type) : "未绑定终点"}`
    : " / 未绑定点位";
  const attackTargets = path.waypointPointIds?.length ? ` / 途经 ${path.waypointPointIds.length} 个攻击目标` : "";
  return `${semanticLabel(path.type)} / 执行：${routeSourceLabel(path)} · ${routeActorLabel(path)} / ${mode} / 宽 ${path.width || state.pathWidth}${binding}${attackTargets}`;
}

function routeSourceLabel(path) {
  const id = path.sourceBindingId || path.startPointId;
  if (!id) return "未绑定来源";
  if ((path.sourceBindingKind || "point") === "area") {
    const area = [...state.map.placementZones, ...state.draft.placementZones].find((item) => item.id === id);
    return area ? `${semanticLabel(area.areaType)} · ${area.name || fallbackObjectName("区域", area.id)}` : "来源区域已删除";
  }
  const point = findPointById(id);
  return point ? `${semanticLabel(point.type)} · ${point.name || fallbackPointName(point)}` : "来源点位已删除";
}

function routeActorLabel(path) {
  const value = path.actorScope || (path.type === "movement_route" ? "source_all" : "player");
  return {
    source_all: "来源生成的全部敌人",
    normal_enemy: "普通敌人",
    elite_enemy: "精英敌人",
    boss: "Boss",
    player: "玩家",
    hero: "英雄",
    enemy: "指定敌人",
    npc: "NPC/过场角色"
  }[value] || value;
}

function addShooterRouteRuleDraft() {
  const rule = {
    id: nextId("route"),
    name: randomObjectName("路线"),
    kind: "shooter_route_rule",
    type: state.semanticType,
    scrollDirection: currentScrollDirection(),
    entry: shooterEntry.value,
    movement: shooterMovement.value,
    formation: shooterFormation.value,
    frequency: shooterFrequency.value,
    randomStrength: "medium",
    points: []
  };
  state.draft.paths.push(rule);
  state.draftHistory.push({ action: "add", bucket: "paths", id: rule.id });
  state.draft.dirty = true;
  chatNotice.textContent = "已添加射击敌军路线规则。";
  renderAll();
}

function entryLabel(value) {
  return {
    top_random: "顶部随机",
    left_random: "左侧随机",
    right_random: "右侧随机",
    edge_random: "全边缘随机",
    anchor: "锚点生成"
  }[value] || value;
}

function movementLabel(value) {
  return {
    straight: "直线推进",
    s_curve: "S型",
    diagonal: "斜向穿插",
    dive: "俯冲",
    chase: "追踪玩家",
    ai_random: "AI随机"
  }[value] || value;
}

function formationLabel(value) {
  return {
    single: "单体",
    line: "横排",
    v: "V字",
    double: "双列",
    ai_random: "AI随机"
  }[value] || value;
}

function frequencyLabel(value) {
  return {
    low: "低频",
    medium: "中频",
    high: "高频"
  }[value] || value;
}

function editObjectLabel() {
  if (state.editObject === "point") return "点位";
  if (state.editObject === "path") return "路线";
  return "区域";
}

function selectObject(id, bucket, source) {
  state.selectedCanvasEntity = null;
  state.selectedShooterInstanceId = null;
  state.selectedObject = { id, bucket, source };
  state.selectedPointId = bucket === "points" ? id : null;
  const row = currentObjectRows().find((item) => item.id === id && item.bucket === bucket && item.source === source);
  if (row) chatNotice.textContent = `已选中${row.type.replace("已应用 ", "").replace("草稿 ", "")}：${row.meta}`;
  renderAll();
}

function selectCanvasEntity(kind, id = null) {
  state.selectedCanvasEntity = { kind, id };
  state.selectedShooterInstanceId = null;
  state.selectedObject = null;
  state.selectedPointId = null;
  if (kind === "background") chatNotice.textContent = "已选中底图。";
  if (kind === "asset") {
    const object = findAsset(id);
    if (object) chatNotice.textContent = `已选中素材：${object.name}`;
  }
  renderAll();
}

function isSelectedCanvasEntity(kind, id = null) {
  return state.selectedCanvasEntity?.kind === kind && (id === null || state.selectedCanvasEntity.id === id);
}

function hasCanvasEntitySelection() {
  return Boolean(state.selectedCanvasEntity);
}

function isSelectedObject(id, bucket, source) {
  return state.selectedObject?.id === id && state.selectedObject?.bucket === bucket && state.selectedObject?.source === source;
}

function isSelectedZone(zone, bucket, source) {
  return isSelectedObject(zone.id, bucket, source) || isSelectedObject(legacyAreaGroupId(zone, bucket, source), bucket, source);
}

function clearSelectedObject(id) {
  if (!id || state.selectedObject?.id === id) state.selectedObject = null;
  if (!id || state.selectedPointId === id) state.selectedPointId = null;
  if (!id) state.selectedCanvasEntity = null;
}

function deleteObjectFromList(id, bucket, source) {
  const target = source === "map" ? state.map : state.draft;
  clearRouteSourceBindings(id);
  if (bucket === "points") clearPointBindings(id);
  if (isLegacyAreaGroupKey(id)) {
    target[bucket] = target[bucket].filter((item) => legacyAreaGroupId(item, bucket, source) !== id);
  } else {
    target[bucket] = target[bucket].filter((item) => item.id !== id);
  }
  clearSelectedObject(id);
  if (state.activeDraftPolyline?.id === id) state.activeDraftPolyline = null;
  if (source === "draft") state.draft.dirty = hasDraftChanges();
  chatNotice.textContent = `${editObjectLabel()}对象已删除。`;
  renderAll();
}

function clearRouteSourceBindings(id) {
  [...state.map.paths, ...state.draft.paths].forEach((path) => {
    if (path.sourceBindingId === id) {
      path.sourceBindingId = null;
      path.sourceBindingKind = null;
    }
  });
}

function clearPointBindings(id) {
  [...state.map.paths, ...state.draft.paths].forEach((path) => {
    if (path.startPointId === id) path.startPointId = null;
    if (path.endPointId === id) path.endPointId = null;
    path.waypointPointIds = (path.waypointPointIds || []).filter((pointId) => pointId !== id);
  });
}

function updateActivePathWidth(width) {
  if (state.activeDraftPolyline) {
    state.activeDraftPolyline.width = width;
  }
  if (state.selectedObject?.bucket !== "paths") return;
  const target = state.selectedObject.source === "map" ? state.map : state.draft;
  const path = target.paths.find((item) => item.id === state.selectedObject.id);
  if (!path) return;
  path.width = width;
  if (state.selectedObject.source === "draft") state.draft.dirty = hasDraftChanges();
}

function semanticLabel(value) {
  for (const preset of Object.values(gameMapPresets)) {
    for (const options of Object.values(preset)) {
      const match = options.find(([optionValue]) => optionValue === value);
      if (match) return match[1];
    }
  }
  return value;
}

function collisionMeta(item) {
  const label = {
    movement: "移动",
    projectile: "弹道",
    vision: "视野",
    all: "全部"
  }[item.blockingType];
  if (item.shape === "brush") return `${label} / 单笔笔刷 ${item.stamps.length}点`;
  if (item.shape === "circle") return `${label} / 笔刷 ${Math.round(item.r * 2)}`;
  if (item.shape === "polygon") return `${label} / 套索 ${item.points.length}点`;
  return `${label} / ${Math.round(item.w)}x${Math.round(item.h)}`;
}

function createInitialGameplayRuntime() {
  return {
    mode: "wave_defense",
    supported: true,
    running: true,
    lastUpdate: 0,
    time: 0,
    baseHp: 20,
    gold: 30,
    exp: 0,
    wave: 1,
    spawnTimer: 0,
    spawnIntervalBase: 1.15,
    enemyHpMultiplier: 1,
    enemySpeedMultiplier: 1,
    killReward: 2,
    expPerKill: 1,
    buildCost: 10,
    buildDiscount: 0,
    maxWaves: 5,
    waveTarget: 0,
    waveSpawned: 0,
    waveBreak: 0,
    waveReward: 0,
    waveState: "spawning",
    kills: 0,
    score: 0,
    result: null,
    heroEnabled: true,
    heroDamageMultiplier: 1,
    enemies: [],
    towers: [],
    projectiles: [],
    vfx: [],
    vfxLastUpdate: 0,
    route: [
      { x: 92, y: 160 },
      { x: 610, y: 260 },
      { x: 248, y: 560 },
      { x: 625, y: 810 },
      { x: 420, y: 1220 }
    ],
    buildPoints: [],
    hero: { x: 330, y: 1040, hp: 30, maxHp: 30, cooldown: 0, mode: "path", defeatedTimer: 0 },
    cards: [],
    player: { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, hp: 30, maxHp: 30, speed: 220, attackRange: 120, cooldown: 0, damage: 5, level: 1 },
    orbs: [],
    upgradeChoices: [],
    towerMenu: null,
    runGoalSeconds: 90,
    deck: {
      playerHp: 30,
      enemyHp: 45,
      enemyMaxHp: 45,
      energy: 3,
      turn: 1,
      block: 0,
      score: 0,
      encounter: 1,
      drawPile: [],
      discardPile: [],
      hand: [],
      rewardChoices: [],
      enemyIntent: { type: "attack", value: 8 },
      status: "playing",
      discardMode: false,
      discardUsedThisTurn: false
    },
    placeholder: null,
    cardBonus: { damage: 1, gold: 0, slow: 1 },
    fusion: {
      mode: "none",
      ruleSpec: null,
      energy: 0,
      maxEnergy: 0,
      drawTimer: 0,
      drawInterval: 8,
      drawPile: [],
      discardPile: [],
      hand: [],
      activeEffects: [],
      charges: 0,
      pendingChoice: false,
      pendingHeroGrowth: null,
      pendingDeckBuild: null,
      pendingDeckAction: null,
      risk: { hpMultiplier: 1, speedMultiplier: 1, extraEnemies: 0, leakDamage: 0, eventLevel: 0, extraSpawn: 0 },
      buildSelection: null
    },
    message: "试玩：等待生成"
  };
}

function createDefaultGameplayTuning() {
  return {
    primaryLoop: "core_loop.wave_defense",
    secondaryLoop: "core_loop.deck_builder",
    fusionTemplate: "wave_tactic_cards",
    validationGoal: "playtest",
    enemyPressure: "medium",
    resourcePace: "standard",
    growthPace: "medium",
    cardImpact: "tower",
    heroRole: "assist",
    pressureIntensity: 100,
    resourceGenerosity: 100,
    constructionCost: 100,
    cardRewardScale: 100,
    riskPenaltyScale: 100,
    heroPower: 100
  };
}

const blueprintAliases = {
  "blueprint.kingdom_rush_like": ["kingdom rush", "王国保卫战", "皇家守卫军"],
  "blueprint.plants_vs_zombies_like": ["plants vs zombies", "pvz", "植物大战僵尸"],
  "blueprint.vampire_survivors_like": ["vampire survivors", "吸血鬼幸存者", "幸存者", "割草"],
  "blueprint.balatro_like": ["balatro", "小丑牌", "扑克牌 roguelike", "扑克牌肉鸽"],
  "blueprint.slay_the_spire_like": ["slay the spire", "杀戮尖塔", "爬塔卡牌"],
  "blueprint.auto_chess_like": ["auto chess", "自走棋", "云顶"],
  "blueprint.into_the_breach_like": ["into the breach", "战棋", "回合策略"],
  "blueprint.factorio_like": ["factorio", "异星工厂", "工厂", "自动化"],
  "blueprint.match3_like": ["match3", "三消", "消消乐", "candy crush"],
  "blueprint.merge_game_like": ["merge", "合成", "2048"],
  "blueprint.idle_clicker_like": ["idle", "放置", "挂机", "clicker"]
};

const themeKeywords = [
  ["三国", "three_kingdoms", "古代战争 / 三国题材"],
  ["西游", "journey_to_west", "神话 / 西游题材"],
  ["武侠", "wuxia", "武侠题材"],
  ["仙侠", "xianxia", "仙侠题材"],
  ["末日", "post_apocalypse", "末日题材"],
  ["僵尸", "zombie", "僵尸题材"],
  ["科幻", "sci_fi", "科幻题材"],
  ["赛博", "cyberpunk", "赛博朋克题材"],
  ["魔法", "fantasy_magic", "魔法幻想题材"]
];

const actionByModule = {
  "module.tower_building": ["place_tower", "upgrade_tower", "sell_tower"],
  "module.card_system": ["play_card", "choose_card"],
  "module.deck_hand": ["draw_cards", "discard_cards"],
  "module.hero_control": ["move_hero", "cast_hero_skill"],
  "module.player_movement": ["move_player"],
  "module.auto_attack": ["position_for_auto_attack"],
  "module.attack_system": ["attack_or_auto_attack"],
  "module.shop_system": ["buy_item", "reroll_shop"],
  "module.board_grid": ["select_grid_cell"],
  "module.unit_system": ["select_unit", "move_unit"],
  "module.action_point": ["spend_action_point"],
  "module.merge_units": ["merge_items"]
};

function loadGameplayKb() {
  gameplayRuntimeStatus.textContent = "试玩：正在准备玩法知识库";
  fetch("data/game-prototype-kb/gpkb_v0_1.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((kb) => {
      state.gpkb = kb;
      gameplayRuntimeStatus.textContent = "试玩：等待 Chat 输入";
      renderGameplayEditor();
      renderPreview();
    })
    .catch((error) => {
      gameplayRuntimeStatus.textContent = `试玩：玩法知识库加载失败，请通过本地服务打开页面（${error.message}）`;
      renderGameplayEditor();
    });
}

function generateGameplayFromPrompt(prompt, options = {}) {
  if (!state.gpkb) {
    gameplayRuntimeStatus.textContent = "试玩：玩法知识库尚未加载";
    return;
  }
  const skeleton = generateGameplaySkeletonFromKb(prompt.trim() || "塔防");
  state.gameplaySkeleton = skeleton;
  state.previewHasContent = true;
  syncGeneratedGameplayWorkspace(skeleton);
  syncGameplayTuningFromSkeleton(skeleton);
  applyGameplayTuningToSkeleton(skeleton);
  state.gameplayExperiment = createGameplayExperiment(skeleton, state.gameplayTuning);
  state.gameplayDirty = false;
  resetGameplayRuntime();
  if (options.appendChatCard !== false) appendGameplayChatCard(prompt, skeleton);
  renderGameplayEditor();
  renderBalance();
  renderAll();
  renderPreview();
}

function syncGeneratedGameplayWorkspace(skeleton) {
  const nextGameType = gameTypeFromGameplaySkeleton(skeleton);
  if (!nextGameType || nextGameType === state.gameType) return;
  state.gameType = nextGameType;
  clearSelectedObject();
  state.activeDraftPolyline = null;
  gameTypeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.gameType === nextGameType);
  });
  syncSemanticOptions(true);
  syncScrollControls();
  resetSimulation();
}

function gameTypeFromGameplaySkeleton(skeleton) {
  if (!skeleton) return state.gameType;
  const primary = skeleton.primary_loop;
  const moduleIds = new Set((skeleton.modules || []).map((module) => module.id));
  const prompt = String(skeleton.user_prompt || "").toLowerCase();
  if (primary === "core_loop.survival_growth" || moduleIds.has("module.player_movement") || /幸存者|割草|survivor/.test(prompt)) return "survivalDefense";
  if (/射击|弹幕|shooter|stg/.test(prompt)) return "shooter";
  return "towerDefense";
}

function handleChatSubmit() {
  if (state.chatBusy) return;
  const prompt = chatComposerInput.value.trim();
  const attachments = state.chatAttachments.slice();
  if (!prompt && !attachments.length) return;
  chatComposerInput.value = "";
  state.chatAttachments = [];
  renderChatAttachmentPreview();
  appendChatUserMessage(prompt || "根据上传素材生成地图", { attachments });
  if (!state.gpkb) {
    appendAssistantNotice("玩法知识库仍在加载", "本地玩法 KB 还没准备好，请稍后再发送。");
    chatNotice.textContent = "玩法知识库仍在加载，请稍后再试。";
    return;
  }
  applyChatAttachmentsToMap(attachments);
  runChatGameplayGeneration(prompt || "根据上传素材生成地图", attachments);
}

function chatTimeLabel(date = new Date()) {
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function setChatBusy(isBusy) {
  state.chatBusy = isBusy;
  chatSend.disabled = isBusy;
  chatSend.innerHTML = isBusy
    ? `<span class="material-symbols-rounded" aria-hidden="true">hourglass_top</span>`
    : `<span class="material-symbols-rounded" aria-hidden="true">graphic_eq</span>`;
}

function appendChatUserMessage(text, options = {}) {
  const message = document.createElement("article");
  message.className = `chat-message chat-message-user${options.compact ? " is-compact" : ""}`;
  const attachments = options.attachments || [];
  const attachmentMarkup = attachments.length
    ? `<div class="chat-user-attachments">${attachments.map((item) => `
      <span>
        <span class="material-symbols-rounded" aria-hidden="true">${item.kind === "video" ? "movie" : "image"}</span>
        ${escapeHtml(item.name)}
      </span>
    `).join("")}</div>`
    : "";
  message.innerHTML = `
    <div class="chat-message-meta">
      <span>${escapeHtml(options.label || "你")}</span>
      <time>${escapeHtml(chatTimeLabel())}</time>
    </div>
    <div class="chat-user-bubble">
      <p>${escapeHtml(text)}</p>
      ${attachmentMarkup}
    </div>
  `;
  chatStream.appendChild(message);
  chatStream.scrollTop = chatStream.scrollHeight;
  return message;
}

function renderChatAttachmentPreview() {
  if (!chatAttachmentPreview) return;
  if (!state.chatAttachments.length) {
    chatAttachmentPreview.hidden = true;
    chatAttachmentPreview.innerHTML = "";
    return;
  }
  chatAttachmentPreview.hidden = false;
  chatAttachmentPreview.innerHTML = state.chatAttachments.map((item) => `
    <span class="chat-attachment-chip">
      <span class="material-symbols-rounded" aria-hidden="true">${item.kind === "video" ? "movie" : "image"}</span>
      <span>${escapeHtml(item.name)}</span>
      <button type="button" data-remove-chat-attachment="${escapeHtml(item.id)}" aria-label="移除 ${escapeHtml(item.name)}">
        <span class="material-symbols-rounded" aria-hidden="true">close</span>
      </button>
    </span>
  `).join("");
}

function renderChatModeButton() {
  if (!chatModeButton) return;
  chatModeButton.innerHTML = `
    <span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span>
    <span>Auto</span>
    <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
  `;
}

function toggleExtensionPopover(open) {
  if (!extensionPopover || !chatExtensionsToggle) return;
  extensionPopover.hidden = !open;
  chatExtensionsToggle.setAttribute("aria-expanded", String(open));
  if (open) {
    const activeTab = extensionPopover.querySelector(".extension-tabs button.active");
    filterExtensionRows(activeTab?.dataset.extensionTab || "skills");
  }
}

function filterExtensionRows(category) {
  if (!extensionPopover) return;
  extensionPopover.querySelectorAll("[data-extension-category]").forEach((row) => {
    row.hidden = category !== "all" && row.dataset.extensionCategory !== category;
  });
}

function applyChatAttachmentsToMap(attachments = []) {
  const firstImage = attachments.find((item) => item.kind === "image" && item.file);
  if (!firstImage) return;
  readImageFile(firstImage.file, (url) => {
    state.previewHasContent = true;
    state.map.backgroundUrl = url;
    state.map.backgroundName = firstImage.name;
    cacheImage(url, renderAll);
    selectCanvasEntity("background");
    chatNotice.textContent = `已从 Chat 导入地图素材：${firstImage.name}`;
    renderAll();
  });
}

function appendAssistantNotice(title, body, actions = []) {
  const card = document.createElement("article");
  card.className = "chat-message chat-message-assistant assistant-result-card";
  card.innerHTML = `
    <div class="chat-message-meta">
      <span class="assistant-avatar"><span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span> AI Copilot</span>
      <time>${escapeHtml(chatTimeLabel())}</time>
    </div>
    <strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(body)}</p>
    ${renderChatActionButtons(actions)}
  `;
  bindChatActionButtons(card);
  chatStream.appendChild(card);
  chatStream.scrollTop = chatStream.scrollHeight;
  return card;
}

function runChatGameplayGeneration(prompt, attachments = []) {
  const analysis = analyzeGameplayPrompt(prompt);
  const guidance = chatGuidanceForContext(prompt, attachments, analysis);
  const steps = [
    { icon: "travel_explore", label: "理解输入", detail: `识别到 ${analysis.themeLabel} / ${analysis.primaryLabel}` },
    attachments.length
      ? { icon: "perm_media", label: "读取上传素材", detail: chatAttachmentSummary(attachments) }
      : { icon: "hub", label: "匹配玩法类型", detail: analysis.matchSummary },
    { icon: "view_in_ar", label: "生成灰盒试玩", detail: "刷新小程序预览和右侧上下文" },
    { icon: guidance.icon, label: "准备下一步入口", detail: guidance.stepDetail }
  ];
  setChatBusy(true);
  const processCard = appendAssistantProcessCard({
    title: "正在生成可试玩 demo",
    summary: `我会根据「${prompt}」匹配玩法类型，并把结果同步到右侧工作区。`,
    steps
  });
  runAssistantProcess(processCard, steps, (elapsed) => {
    generateGameplayFromPrompt(prompt, { appendChatCard: false });
    setView(guidance.view);
    const finalAnalysis = analyzeCurrentGameplayForChat(prompt);
    const finalGuidance = chatGuidanceForContext(prompt, attachments, { ...analysis, ...finalAnalysis });
    completeAssistantWorkCard(processCard, {
      title: finalGuidance.title,
      summary: finalGuidance.summary,
      elapsed,
      resultMarkup: renderGameplayResultContent(prompt, state.gameplaySkeleton, { ...analysis, ...finalAnalysis, elapsed, attachments }, finalGuidance)
    });
    bindChatActionButtons(processCard);
    chatNotice.textContent = finalGuidance.notice;
    setChatBusy(false);
  });
}

function appendAssistantProcessCard({ title, summary, steps = [] }) {
  const card = document.createElement("article");
  card.className = "chat-message chat-message-assistant assistant-work-card assistant-process-card";
  card.innerHTML = `
    <div class="chat-message-meta">
      <span class="assistant-avatar"><span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span> AI Copilot</span>
      <time>${escapeHtml(chatTimeLabel())}</time>
    </div>
    <div class="process-head">
      <strong data-work-title>${escapeHtml(title)}</strong>
      <span data-work-status>生成中</span>
    </div>
    <p data-work-summary>${escapeHtml(summary)}</p>
    <details class="assistant-thinking">
      <summary>
        <span><span class="material-symbols-rounded" aria-hidden="true">psychology_alt</span> 已思考 <span data-process-elapsed>0.0s</span></span>
        <span>查看关键步骤</span>
      </summary>
      ${renderAssistantSteps(steps)}
    </details>
    <div class="assistant-result-slot" data-result-slot hidden></div>
  `;
  chatStream.appendChild(card);
  chatStream.scrollTop = chatStream.scrollHeight;
  return card;
}

function renderAssistantSteps(steps = []) {
  return `<ol class="process-steps">
    ${steps.map((step, index) => `
      <li data-process-step="${index}">
        <span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(step.icon || "radio_button_unchecked")}</span>
        <div><strong>${escapeHtml(step.label)}</strong><small>${escapeHtml(step.detail)}</small></div>
      </li>
    `).join("")}
  </ol>`;
}

function completeAssistantWorkCard(card, { title, summary, elapsed, resultMarkup }) {
  const titleNode = card.querySelector("[data-work-title]");
  const summaryNode = card.querySelector("[data-work-summary]");
  const statusNode = card.querySelector("[data-work-status]");
  const slot = card.querySelector("[data-result-slot]");
  if (titleNode) titleNode.textContent = title;
  if (summaryNode) summaryNode.textContent = summary || "";
  if (statusNode) statusNode.textContent = `耗时 ${elapsed || "3.8"}s`;
  if (slot) {
    slot.hidden = false;
    slot.innerHTML = resultMarkup || "";
  }
  card.classList.add("is-complete");
  chatStream.scrollTop = chatStream.scrollHeight;
}

function runAssistantProcess(card, steps, onComplete, options = {}) {
  const started = performance.now();
  const totalMs = options.totalMs || 3800;
  const elapsedNode = card.querySelector("[data-process-elapsed]");
  const tick = window.setInterval(() => {
    if (elapsedNode) elapsedNode.textContent = `${((performance.now() - started) / 1000).toFixed(1)}s`;
  }, 120);
  steps.forEach((_, index) => {
    window.setTimeout(() => {
      card.querySelectorAll("[data-process-step]").forEach((item, itemIndex) => {
        item.classList.toggle("is-active", itemIndex === index);
        item.classList.toggle("is-complete", itemIndex < index);
      });
      chatStream.scrollTop = chatStream.scrollHeight;
    }, 320 + index * (totalMs / Math.max(steps.length, 1)));
  });
  window.setTimeout(() => {
    window.clearInterval(tick);
    card.querySelectorAll("[data-process-step]").forEach((item) => {
      item.classList.remove("is-active");
      item.classList.add("is-complete");
    });
    card.classList.add("is-complete");
    const elapsed = ((performance.now() - started) / 1000).toFixed(1);
    if (elapsedNode) elapsedNode.textContent = `${elapsed}s`;
    onComplete?.(elapsed);
    chatStream.scrollTop = chatStream.scrollHeight;
  }, totalMs);
}

function analyzeGameplayPrompt(prompt) {
  const skeleton = state.gpkb ? generateGameplaySkeletonFromKb(prompt.trim() || "塔防") : null;
  const primaryLabel = primaryLoopLabel(skeleton?.primary_loop);
  const secondaryLabels = (skeleton?.secondary_loops || []).map(secondaryLoopLabel).filter((label) => label && label !== "无融合");
  const blueprintLabels = (skeleton?.reference_blueprints || []).map((id) => getKbItem(state.gpkb?.blueprints || [], id)?.name || readableGameplayId(id));
  const themeLabel = gameplayThemeLabel(skeleton?.theme?.setting);
  const matchedTypes = uniqueKeepOrder([primaryLabel, ...secondaryLabels, ...blueprintLabels]).filter(Boolean);
  return {
    skeleton,
    themeLabel,
    primaryLabel,
    secondaryLabels,
    matchedTypes,
    matchSummary: matchedTypes.length ? matchedTypes.join(" / ") : "默认塔防灰盒"
  };
}

function analyzeCurrentGameplayForChat(prompt) {
  const skeleton = state.gameplaySkeleton;
  const experiment = activeGameplayExperiment();
  const template = activeGameplayFusionTemplate(experiment);
  const modules = (skeleton?.modules || []).slice(0, 5).map((module) => readableGameplayId(module.id));
  return {
    title: gameplayFusionTitle(skeleton),
    primaryLabel: primaryLoopLabel(experiment?.primaryLoop || skeleton?.primary_loop),
    secondaryLabels: [secondaryLoopLabel(experiment?.secondaryLoop || skeleton?.secondary_loops?.[0])].filter((label) => label && label !== "无融合"),
    templateLabel: template?.label || gameplayTemplateDescription(state.gameplayTuning.fusionTemplate),
    modules,
    prompt
  };
}

function chatGuidanceForContext(prompt, attachments = [], analysis = {}) {
  const text = String(prompt || "").toLowerCase();
  const hasMedia = attachments.length > 0;
  const asksForMap = hasMedia || /地图|关卡|路径|地形|底图|图片|视频|素材|碰撞|可放置/.test(text);
  const asksForBalance = /平衡|数值|难度|经济|压力|试跑|通关|结算|结束编辑|已经完成|完成游戏/.test(text);
  const completionIntent = /结束编辑|已经完成|完成游戏|都先这样|先这样|进入平衡|平衡性|试跑/.test(text);
  if (asksForBalance && state.gameplaySkeleton && (!asksForMap || completionIntent)) {
    return {
      view: "balance",
      icon: "tune",
      title: "平衡性编辑已准备",
      summary: "当前玩法上下文已生成，可以进入平衡性编辑做试跑和数值校准。",
      notice: "已准备平衡性编辑入口。",
      stepDetail: "根据当前玩法上下文透传平衡性编辑",
      calloutTitle: "下一步：进入平衡性编辑",
      calloutBody: "适合在玩法和地图都稳定后，检查压力、经济、波次和通关结果。",
      actions: [{ view: "balance", icon: "tune", label: "打开平衡性编辑" }]
    };
  }
  if (asksForMap) {
    return {
      view: "map",
      icon: "map",
      title: hasMedia ? "地图素材已接入" : "地图编辑已准备",
      summary: hasMedia ? "上传素材已作为地图构建上下文，预览和地图编辑会优先围绕素材展开。" : "当前输入更偏向地图和关卡构建，已优先准备地图编辑入口。",
      notice: hasMedia ? "已根据上传素材准备地图编辑。" : "已准备地图编辑入口。",
      stepDetail: hasMedia ? "上传素材进入地图编辑上下文" : "地图生成结果进入地图编辑",
      calloutTitle: "下一步：进入地图编辑",
      calloutBody: "适合继续处理路径、出生点、碰撞区、可放置区和素材层。",
      actions: [{ view: "map", icon: "map", label: "打开地图编辑" }]
    };
  }
  return {
    view: "gameplay",
    icon: "sports_esports",
    title: "玩法 demo 已生成",
    summary: `${analysis.title || "灰盒玩法"} 已同步到小程序预览和右侧玩法实验台。`,
    notice: "已生成玩法 demo，建议先在玩法实验台微调。",
    stepDetail: "先进入玩法实验台微调可试玩规则",
    calloutTitle: "下一步：进入玩法试验台",
    calloutBody: "适合先确认核心循环、融合方案和试玩反馈，再继续地图与数值。",
    actions: [{ view: "gameplay", icon: "sports_esports", label: "打开玩法编辑" }]
  };
}

function chatAttachmentSummary(attachments = []) {
  const imageCount = attachments.filter((item) => item.kind === "image").length;
  const videoCount = attachments.filter((item) => item.kind === "video").length;
  return [`图片 ${imageCount}`, `视频 ${videoCount}`].filter((item) => !item.endsWith(" 0")).join(" / ") || "无素材";
}

function renderGameplayResultContent(prompt, skeleton, analysis = {}, guidance) {
  const secondary = analysis.secondaryLabels?.length ? analysis.secondaryLabels.join(" / ") : "无融合";
  const attachmentLine = analysis.attachments?.length
    ? `<p class="ai-result-note">已接入素材：${escapeHtml(chatAttachmentSummary(analysis.attachments))}</p>`
    : "";
  return `
    <div class="assistant-result-content gameplay-chat-card">
      <div class="ai-result-grid">
        <article><span>主题</span><strong>${escapeHtml(gameplayThemeLabel(skeleton.theme?.setting))}</strong></article>
        <article><span>主玩法</span><strong>${escapeHtml(analysis.primaryLabel || primaryLoopLabel(skeleton.primary_loop))}</strong></article>
        <article><span>融合</span><strong>${escapeHtml(secondary)}</strong></article>
        <article><span>方案</span><strong>${escapeHtml(analysis.templateLabel || "波次防守")}</strong></article>
      </div>
      ${attachmentLine}
      <div class="chat-guidance-callout">
        <span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(guidance.icon)}</span>
        <div>
          <strong>${escapeHtml(guidance.calloutTitle)}</strong>
          <p>${escapeHtml(guidance.calloutBody)}</p>
          ${renderChatActionButtons(guidance.actions)}
        </div>
      </div>
    </div>
  `;
}

function appendGameplayChatCard(prompt, skeleton, analysis = {}) {
  const guidance = chatGuidanceForContext(prompt, [], analysis);
  const card = appendAssistantProcessCard({
    title: guidance.title,
    summary: guidance.summary,
    steps: [{ icon: guidance.icon, label: "生成结果", detail: guidance.stepDetail }]
  });
  completeAssistantWorkCard(card, {
    title: guidance.title,
    summary: guidance.summary,
    elapsed: analysis.elapsed || "3.8",
    resultMarkup: renderGameplayResultContent(prompt, skeleton, analysis, guidance)
  });
  bindChatActionButtons(card);
  chatNotice.textContent = `已根据「${prompt}」生成玩法 demo。`;
}

function appendStructuredChatInput(input) {
  appendStructuredChatCard({
    variant: "input",
    icon: "input",
    eyebrow: "结构化输入",
    title: input.title,
    summary: input.summary,
    fields: input.fields,
    payload: input.payload,
    payloadLabel: "查看 input payload",
    actions: chatActionsForPayload(input.payload)
  });
}

function appendStructuredChatResult(result) {
  const card = appendAssistantProcessCard({
    title: result.title,
    summary: result.summary || "结果已写入主流程。",
    steps: [{ icon: "task_alt", label: "生成结果", detail: result.title }]
  });
  completeAssistantWorkCard(card, {
    title: result.title,
    summary: result.summary || "结果已写入主流程。",
    elapsed: "0.1",
    resultMarkup: renderStructuredResultContent(result)
  });
  bindChatActionButtons(card);
}

function appendStructuredChatCard({ variant, icon, eyebrow, title, summary, fields = [], payload, payloadLabel, actions = [] }) {
  const card = document.createElement("article");
  card.className = `chat-message ${variant === "input" ? "chat-message-user" : "chat-message-assistant"} structured-chat-card structured-chat-card-${variant}`;
  const payloadMarkup = payload
    ? `<details class="structured-payload"><summary>${escapeHtml(payloadLabel || "查看结构化数据")}</summary><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></details>`
    : "";
  card.innerHTML = `
    <div class="chat-message-meta">
      <span>${variant === "input" ? "结构化输入" : `<span class="assistant-avatar"><span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span> AI Copilot</span>`}</span>
      <time>${escapeHtml(chatTimeLabel())}</time>
    </div>
    <div class="structured-card-head">
      <span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(icon)}</span>
      <span>${escapeHtml(eyebrow)}</span>
    </div>
    <strong>${escapeHtml(title)}</strong>
    ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
    ${fields.length ? `<dl>${fields.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}</dl>` : ""}
    ${payloadMarkup}
    ${renderChatActionButtons(actions)}
  `;
  bindChatActionButtons(card);
  chatStream.appendChild(card);
  chatStream.scrollTop = chatStream.scrollHeight;
  return card;
}

function appendApplicationRoundTrip(input, result) {
  appendStructuredChatInput(input);
  appendEditorApplicationResponse(input, result);
}

function appendEditorApplicationResponse(input, result) {
  const editor = input?.payload?.editor || result?.payload?.type?.split(".")[0] || "gameplay";
  const label = {
    gameplay: "玩法编辑",
    map: "地图编辑",
    balance: "平衡性编辑"
  }[editor] || "编辑器";
  const steps = [
    { icon: "input", label: "读取结构化输入", detail: input.title },
    { icon: "schema", label: "合并到主流程", detail: `${label}结果进入 vibe coding 上下文` },
    { icon: "sync", label: "刷新关联工作区", detail: "同步预览、编辑器和下游上下文" }
  ];
  const processCard = appendAssistantProcessCard({
    title: `${label}应用中`,
    summary: "右侧编辑结果会作为结构化输入回到左侧主流程。",
    steps
  });
  runAssistantProcess(processCard, steps, (elapsed) => {
    completeAssistantWorkCard(processCard, {
      title: result.title,
      summary: result.summary,
      elapsed,
      resultMarkup: renderStructuredResultContent(result)
    });
    bindChatActionButtons(processCard);
  }, { totalMs: 3200 });
}

function renderStructuredResultContent(result) {
  const fields = result.fields || [];
  const payload = result.payload;
  const payloadMarkup = payload
    ? `<details class="structured-payload"><summary>查看 result payload</summary><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></details>`
    : "";
  return `
    <div class="structured-result-content">
      <div class="structured-card-head">
        <span class="material-symbols-rounded" aria-hidden="true">task_alt</span>
        <span>生成结果</span>
      </div>
      ${fields.length ? `<dl>${fields.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}</dl>` : ""}
      ${payloadMarkup}
      ${renderChatActionButtons(chatActionsForPayload(payload || {}))}
    </div>
  `;
}

function renderChatActionButtons(actions = []) {
  if (!actions.length) return "";
  return `<div class="chat-card-actions">${actions.map((action) => `
    <button type="button" data-open-view="${escapeHtml(action.view)}">
      <span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(action.icon || "open_in_new")}</span>
      <span>${escapeHtml(action.label)}</span>
    </button>
  `).join("")}</div>`;
}

function bindChatActionButtons(root) {
  root.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setView(button.dataset.openView);
    });
  });
}

function chatActionsForPayload(payload = {}) {
  const type = payload.type || "";
  if (type === "gameplay.result") {
    return [
      { view: "balance", icon: "tune", label: "进入平衡性编辑" }
    ];
  }
  if (type === "map.result") {
    return [
      { view: "map", icon: "map", label: "继续地图编辑" }
    ];
  }
  if (type === "balance.result") {
    return [
      { view: "balance", icon: "query_stats", label: "查看试跑报告" }
    ];
  }
  if (type.startsWith("gameplay")) {
    return [
      { view: "gameplay", icon: "sports_esports", label: "打开玩法编辑" }
    ];
  }
  if (type.startsWith("map")) {
    return [
      { view: "map", icon: "map", label: "打开地图编辑" }
    ];
  }
  if (type.startsWith("balance")) {
    return [
      { view: "balance", icon: "tune", label: "打开平衡性编辑" }
    ];
  }
  return [];
}

function appendGameplayApplicationToChat() {
  const experiment = state.appliedGameplayExperiment || activeGameplayExperiment();
  const template = activeGameplayFusionTemplate(experiment);
  const input = {
    title: "应用玩法编辑",
    summary: "右侧玩法编辑已作为结构化输入提交给 vibe coding 主流程。",
    fields: [
      { label: "基础玩法", value: primaryLoopLabel(experiment?.primaryLoop || state.gameplayTuning.primaryLoop) },
      { label: "融合方向", value: secondaryLoopLabel(experiment?.secondaryLoop || state.gameplayTuning.secondaryLoop) },
      { label: "方案", value: template?.label || gameplayTemplateDescription(state.gameplayTuning.fusionTemplate) },
      { label: "目标", value: state.gameplayTuning.validationGoal === "playtest" ? "可试玩验证" : state.gameplayTuning.validationGoal }
    ],
    payload: {
      type: "gameplay.apply",
      editor: "gameplay",
      title: gameplayFusionTitle(state.gameplaySkeleton),
      primaryLoop: experiment?.primaryLoop || state.gameplayTuning.primaryLoop,
      secondaryLoop: experiment?.secondaryLoop || state.gameplayTuning.secondaryLoop,
      fusionTemplate: experiment?.fusionTemplate || state.gameplayTuning.fusionTemplate,
      tuning: { ...state.gameplayTuning }
    }
  };
  const result = {
    title: "玩法方案已写入主流程",
    summary: "后续地图编辑和平衡性编辑会以该玩法方案作为上下文继续生成。",
    fields: [
      { label: "状态", value: "已生效" },
      { label: "试玩反馈", value: state.gameplayRuntime.message || "等待继续试玩" },
      { label: "下游影响", value: "地图 / 平衡性编辑将读取当前玩法上下文" }
    ],
    payload: {
      type: "gameplay.result",
      accepted: true,
      appliedTitle: gameplayFusionTitle(state.gameplaySkeleton),
      runtimeMode: state.gameplayRuntime.mode,
      supported: state.gameplayRuntime.supported
    }
  };
  appendApplicationRoundTrip(input, result);
}

function createMapApplicationInput() {
  const counts = {
    collisionZones: state.draft.collisionZones.length,
    paths: state.draft.paths.length,
    placementZones: state.draft.placementZones.length,
    points: state.draft.points.length
  };
  counts.total = counts.collisionZones + counts.paths + counts.placementZones + counts.points;
  const labels = [
    counts.points ? `点位 ${counts.points}` : "",
    counts.paths ? `路径 ${counts.paths}` : "",
    counts.collisionZones ? `碰撞区 ${counts.collisionZones}` : "",
    counts.placementZones ? `可放置区 ${counts.placementZones}` : ""
  ].filter(Boolean);
  return {
    title: "应用地图编辑",
    summary: "右侧地图草稿已作为结构化输入提交给 vibe coding 主流程。",
    fields: [
      { label: "关卡", value: state.map.name },
      { label: "地图运动", value: state.map.motion === "scroll" ? "滚动" : "静止" },
      { label: "本次变更", value: labels.join(" / ") || "无新增草稿" }
    ],
    payload: {
      type: "map.apply",
      editor: "map",
      mapId: state.currentMapId,
      mapName: state.map.name,
      gameType: state.gameType,
      counts,
      semanticTypes: uniqueDraftSemanticLabels()
    }
  };
}

function appendMapApplicationToChat(input) {
  const result = {
    title: "地图编辑已写入主流程",
    summary: `${state.map.name} 的草稿层已合并到当前可预览地图。`,
    fields: [
      { label: "状态", value: "已生效" },
      { label: "地图总点位", value: String(state.map.points.length) },
      { label: "地图总路径", value: String(state.map.paths.length) },
      { label: "地图总区域", value: String(state.map.collisionZones.length + state.map.placementZones.length) }
    ],
    payload: {
      type: "map.result",
      accepted: true,
      mapId: state.currentMapId,
      totals: {
        points: state.map.points.length,
        paths: state.map.paths.length,
        collisionZones: state.map.collisionZones.length,
        placementZones: state.map.placementZones.length
      }
    }
  };
  appendApplicationRoundTrip(input, result);
}

function uniqueDraftSemanticLabels() {
  const values = [
    ...state.draft.points.map((item) => item.type),
    ...state.draft.paths.map((item) => item.type),
    ...state.draft.collisionZones.map((item) => item.semanticType),
    ...state.draft.placementZones.map((item) => item.areaType)
  ].filter(Boolean);
  return [...new Set(values)].map(semanticLabel);
}

function gameTypeLabel(type) {
  return {
    towerDefense: "塔防",
    survivalDefense: "守塔割草",
    shooter: "射击"
  }[type] || type;
}

function createBalanceApplicationInput(mode, planKey = null) {
  const profile = activeBalanceProfile();
  const title = mode === "plan" ? "应用平衡性调整方案" : "应用平衡性数值配置";
  const summary = mode === "plan"
    ? "右侧选中的调整方案已作为结构化输入提交给 vibe coding 主流程，并开始试跑验证。"
    : "右侧手动修改的数值配置已作为结构化输入提交给 vibe coding 主流程，并开始试跑验证。";
  return {
    title,
    summary,
    fields: [
      { label: "玩法档案", value: profile.title },
      { label: "应用方式", value: mode === "plan" ? "推荐方案" : "手动配置" },
      { label: "方案", value: mode === "plan" ? planTitle(planKey) : "当前表格数值" },
      { label: "试跑速度", value: `${Number(balanceTestSpeed.value || 1)}x` }
    ],
    payload: {
      type: "balance.apply",
      editor: "balance",
      profile: profile.title,
      gameType: state.gameType,
      mode,
      planKey,
      planTitle: mode === "plan" ? planTitle(planKey) : null,
      speed: Number(balanceTestSpeed.value || 1)
    }
  };
}

function appendPendingBalanceResultToChat() {
  if (!state.pendingBalanceApplication || !state.balanceTest.result) return;
  const test = state.balanceTest;
  const result = test.result;
  appendEditorApplicationResponse(state.pendingBalanceApplication, {
    title: "平衡性试跑结果已写入主流程",
    summary: `本次应用后的试跑结论为：${result.label}。`,
    fields: [
      { label: "星级", value: `${result.stars} 星` },
      { label: "基地血量", value: String(Math.round(result.baseHp)) },
      { label: "漏怪", value: String(test.leaked) },
      { label: "建议", value: result.recommendation }
    ],
    payload: {
      type: "balance.result",
      accepted: true,
      source: test.source,
      conclusion: result.label,
      difficulty: result.difficulty,
      stars: result.stars,
      baseHp: Math.round(result.baseHp),
      leaked: test.leaked,
      kills: test.kills,
      recommendation: result.recommendation
    }
  });
  state.pendingBalanceApplication = null;
}

function syncGameplayTuningFromSkeleton(skeleton) {
  state.gameplayTuning.primaryLoop = skeleton.primary_loop || "core_loop.wave_defense";
  state.gameplayTuning.secondaryLoop = skeleton.secondary_loops?.[0] || "";
  if (skeleton.modules?.some((module) => module.id === "module.random_upgrade_choice") && !state.gameplayTuning.secondaryLoop) {
    state.gameplayTuning.secondaryLoop = "roguelite_growth";
  }
  if (!["", "core_loop.wave_defense", "core_loop.deck_builder", "core_loop.survival_growth", "roguelite_growth"].includes(state.gameplayTuning.secondaryLoop)) {
    state.gameplayTuning.secondaryLoop = "";
  }
  normalizeGameplayLoopPair();
  normalizeGameplayFusionTemplate();
  state.gameplayFusionLens = gameplayFusionLensIdFromTuning(state.gameplayTuning) || "random";
  state.gameplayCustomFusionTarget = null;
}

function applyGameplayTuning() {
  if (!state.gameplaySkeleton) return;
  state.gameplayDirty = true;
  normalizeGameplayLoopPair();
  normalizeGameplayFusionTemplate();
  applyGameplayTuningToSkeleton(state.gameplaySkeleton);
  state.gameplayExperiment = createGameplayExperiment(state.gameplaySkeleton, state.gameplayTuning);
  resetGameplayRuntime();
  renderGameplayEditor();
  renderPreview();
}

function applyGameplayTuningToSkeleton(skeleton) {
  const tuning = state.gameplayTuning;
  skeleton.primary_loop = tuning.primaryLoop;
  skeleton.secondary_loops = tuning.secondaryLoop && tuning.secondaryLoop !== "roguelite_growth" ? [tuning.secondaryLoop] : [];
  if (tuning.secondaryLoop === "roguelite_growth" && !skeleton.modules.some((module) => module.id === "module.random_upgrade_choice")) {
    skeleton.modules.push({ id: "module.random_upgrade_choice", config: { choice_count: 3 } });
  }
  if (tuning.secondaryLoop === "core_loop.deck_builder" && !skeleton.modules.some((module) => module.id === "module.card_system")) {
    skeleton.modules.push({ id: "module.card_system", config: { card_pool_size: 12, hand_size: 3 } });
  }
  if (tuning.heroRole !== "off" && !skeleton.modules.some((module) => module.id === "module.hero_control")) {
    skeleton.modules.push({ id: "module.hero_control", config: { control_mode: "click_to_move", skill_cooldown: 8 } });
  }
  skeleton.title = gameplayFusionTitle(skeleton);
  skeleton.progression_spec = {
    ...skeleton.progression_spec,
    lab_tuning: { ...tuning }
  };
}

function createGameplayExperiment(skeleton, tuning) {
  const fusionTemplate = normalizeGameplayFusionTemplateValue(tuning.primaryLoop, tuning.secondaryLoop, tuning.fusionTemplate);
  const fusionMode = fusionModeFromTemplate(fusionTemplate);
  const runtimeConfig = createGameplayRuntimeConfig(tuning);
  const ruleSpec = gameplayRuleSpec(fusionTemplate);
  return {
    theme: skeleton.theme || { setting: "generic" },
    prompt: skeleton.user_prompt || "",
    skeleton,
    primaryLoop: tuning.primaryLoop,
    secondaryLoop: tuning.secondaryLoop,
    fusionTemplate,
    fusionMode,
    ruleSpec,
    validationGoal: tuning.validationGoal,
    tuning: { ...tuning, fusionTemplate },
    runtimeConfig,
    mapSpec: deriveExperimentMapSpec(tuning),
    balanceKnobs: deriveExperimentBalanceKnobs(tuning, runtimeConfig)
  };
}

function createGameplayRuntimeConfig(tuning) {
  const pressure = { ...gameplayPressureConfig(tuning.enemyPressure) };
  const resources = { ...gameplayResourceConfig(tuning.resourcePace) };
  const growth = { ...gameplayGrowthConfig(tuning.growthPace) };
  const fusionMode = fusionModeFromTemplate(normalizeGameplayFusionTemplateValue(tuning.primaryLoop, tuning.secondaryLoop, tuning.fusionTemplate));
  const pressureIntensity = tuningScale(tuning.pressureIntensity ?? tuning.enemyStrength);
  const resourceGenerosity = tuningScale(tuning.resourceGenerosity);
  const constructionCost = tuningScale(tuning.constructionCost ?? tuning.buildCostScale);
  const cardRewardScale = tuningScale(tuning.cardRewardScale);
  const riskPenaltyScale = tuningScale(tuning.riskPenaltyScale);
  const heroPower = tuningScale(tuning.heroPower);
  let goalCardBonus = 0;
  pressure.hpMultiplier *= pressureIntensity;
  pressure.spawnInterval /= pressureIntensity;
  pressure.speedMultiplier *= Math.sqrt(pressureIntensity);
  resources.initialGold *= resourceGenerosity;
  resources.killReward *= resourceGenerosity;
  resources.buildCost *= constructionCost;
  resources.initialTowers = Math.max(0, Math.round(resources.initialTowers * Math.min(1.4, resourceGenerosity)));
  growth.expPerKill *= cardRewardScale;
  const tuningScales = {
    enemyStrength: pressureIntensity,
    spawnPace: pressureIntensity,
    pressureIntensity,
    resourceGenerosity,
    buildCostScale: constructionCost,
    upgradeCostScale: constructionCost,
    constructionCost,
    cardRewardScale,
    riskPenaltyScale,
    heroPower
  };
  return {
    pressure,
    resources,
    growth,
    hero: scaleGameplayHeroConfig(gameplayHeroConfig(tuning.heroRole), heroPower),
    fusionIntensity: { light: 0.65, primary: 0.85, dual: 1.25 }[fusionMode] || 0.65,
    cardImpact: tuning.cardImpact,
    goalCardBonus,
    tuningScales,
    fusionTuning: createFusionTuningProfile(tuning, tuningScales)
  };
}

function tuningScale(value) {
  return clamp((Number(value) || 100) / 100, 0, 3);
}

function createFusionTuningProfile(tuning, scales) {
  const card = scales.cardRewardScale || 1;
  const risk = scales.riskPenaltyScale || 1;
  const resource = scales.resourceGenerosity || 1;
  const handCount = card < 0.75 ? 2 : card > 1.55 ? 4 : 3;
  const maxHand = card < 0.75 ? 3 : card > 1.55 ? 5 : 4;
  return {
    template: normalizeGameplayFusionTemplateValue(tuning.primaryLoop, tuning.secondaryLoop, tuning.fusionTemplate),
    cardPower: clamp(0.55 + card * 0.45, 0.55, 1.55),
    cardChoiceCount: card < 0.75 ? 2 : card > 1.45 ? 4 : 3,
    startingHand: handCount,
    maxHand,
    drawIntervalMultiplier: clamp(1 / Math.max(0.55, card), 0.55, 1.85),
    drawPerTrigger: card > 1.7 ? 2 : 1,
    killDrawInterval: card < 0.75 ? 7 : card > 1.45 ? 3 : 5,
    energyPerKill: card < 0.75 ? 0.5 : card > 1.55 ? 1.5 : 1,
    energyCapBonus: card > 1.45 ? 1 : card < 0.75 ? -1 : 0,
    cardCostOffset: card > 1.65 ? -1 : card < 0.7 ? 1 : 0,
    deckTargetChoiceCount: card < 0.75 ? 2 : card > 1.45 ? 4 : 3,
    eventChoiceCount: card < 0.75 ? 2 : card > 1.45 ? 4 : 3,
    waveChoiceCount: card < 0.75 ? 2 : card > 1.45 ? 4 : 3,
    buildHandSize: handCount,
    buildDeckBonus: card > 1.45 ? 2 : card < 0.75 ? -1 : 0,
    riskReward: clamp(card, 0.5, 2),
    riskPenalty: clamp(risk, 0.5, 2),
    resourceSupport: clamp(resource, 0.5, 2)
  };
}

function scaleGameplayHeroConfig(config, scale) {
  return {
    ...config,
    enabled: scale > 0 && config.enabled,
    damageMultiplier: config.damageMultiplier * scale
  };
}

function deriveExperimentMapSpec(tuning) {
  if (tuning.primaryLoop === "core_loop.survival_growth") return { type: "arena", size: [40, 40], spawn: "edge_pressure" };
  if (tuning.primaryLoop === "core_loop.deck_builder") return { type: "card_battle_board", zones: ["enemy", "player", "hand"] };
  if (tuning.primaryLoop === "core_loop.wave_defense") return { type: "path_or_lane_map", lanes: 1, buildPoints: 6 };
  return { type: "unsupported" };
}

function deriveExperimentBalanceKnobs(tuning, runtimeConfig) {
  return {
    primaryLoop: tuning.primaryLoop,
    secondaryLoop: tuning.secondaryLoop,
    fusionTemplate: normalizeGameplayFusionTemplateValue(tuning.primaryLoop, tuning.secondaryLoop, tuning.fusionTemplate),
    pressureIntensity: tuning.pressureIntensity,
    spawnInterval: runtimeConfig.pressure.spawnInterval,
    enemyHpMultiplier: runtimeConfig.pressure.hpMultiplier,
    resourceGenerosity: tuning.resourceGenerosity,
    initialGold: runtimeConfig.resources.initialGold,
    killReward: runtimeConfig.resources.killReward,
    constructionCost: tuning.constructionCost,
    cardRewardScale: tuning.cardRewardScale,
    riskPenaltyScale: tuning.riskPenaltyScale,
    heroPower: tuning.heroPower
  };
}

function activeGameplayExperiment() {
  if (!state.gameplayExperiment && state.gameplaySkeleton) {
    state.gameplayExperiment = createGameplayExperiment(state.gameplaySkeleton, state.gameplayTuning);
  }
  return state.gameplayExperiment;
}

function gameplayAdapterMode(experiment) {
  if (!experiment) return "unsupported";
  if (experiment.primaryLoop === "core_loop.wave_defense") return "wave_defense";
  if (experiment.primaryLoop === "core_loop.survival_growth") return "survival_growth";
  if (experiment.primaryLoop === "core_loop.deck_builder") return "deck_builder";
  return "unsupported";
}

function generateGameplaySkeletonFromKb(prompt) {
  const kb = state.gpkb;
  let loopIds = detectGameplayLoops(prompt, kb);
  let primaryLoop = loopIds[0];
  let secondaryLoops = loopIds.filter((id) => id !== primaryLoop).slice(0, 2);
  const blueprintIds = detectGameplayBlueprints(prompt, kb);
  if (blueprintIds.length && primaryLoop === "core_loop.wave_defense") {
    const firstBlueprint = getKbItem(kb.blueprints, blueprintIds[0]);
    const directWaveMatch = Boolean(scoreGameplayLoop(prompt, getKbItem(kb.core_loops, primaryLoop)));
    if (firstBlueprint?.primary_loop && !directWaveMatch) primaryLoop = firstBlueprint.primary_loop;
  }
  let fusionRule = findGameplayFusionRule(kb, primaryLoop, secondaryLoops[0]);
  if (fusionRule) {
    primaryLoop = fusionRule.primary_loop;
    secondaryLoops = [fusionRule.secondary_loop];
  }

  const primaryDef = getKbItem(kb.core_loops, primaryLoop);
  const secondaryDefs = secondaryLoops.map((id) => getKbItem(kb.core_loops, id)).filter(Boolean);
  const theme = detectGameplayTheme(prompt);
  const moduleIds = deriveGameplayModules(kb, primaryLoop, secondaryLoops, blueprintIds, fusionRule, prompt);
  const entities = collectGameplayEntities(kb, moduleIds, primaryLoop, theme);
  const projectHash = simpleHash(prompt).slice(0, 10);

  return {
    schema_version: "0.1.0",
    project_id: `game_${projectHash}`,
    title: makeGameplayTitle(theme, primaryDef?.name || primaryLoop, secondaryDefs.map((item) => item.name)),
    user_prompt: prompt,
    generation_mode: "kb_rule_based",
    theme,
    primary_loop: primaryLoop,
    secondary_loops: secondaryLoops,
    reference_blueprints: blueprintIds,
    fusion_applied: fusionRule
      ? { id: fusionRule.id, name: fusionRule.name, intent: fusionRule.intent }
      : null,
    loop_steps: fusionRule?.result_loop_steps || primaryDef?.loop_steps || [],
    modules: makeGameplayModuleEntries(kb, moduleIds),
    entities,
    player_actions: deriveGameplayActions(moduleIds),
    resources: deriveGameplayResources(moduleIds),
    win_condition: primaryDef?.default_runtime?.win_condition || "reach_goal",
    fail_condition: primaryDef?.default_runtime?.fail_condition || "hp_zero",
    map_spec: deriveGameplayMapSpec(primaryLoop, moduleIds),
    progression_spec: deriveGameplayProgressionSpec(moduleIds, fusionRule),
    runtime_notes: ["This is a greybox gameplay skeleton. Replace all entities with geometry or placeholders first."].concat(fusionRule?.transformation_rules || []),
    playtest_tuning: {
      target_first_playable_seconds: 30,
      difficulty_curve: "linear_to_stepwise",
      initial_balance_goal: "Make the first 2 minutes playable before adding assets."
    },
    next_editor_handoff: {
      asset_editor: { needs_assets: false, notes: "Use geometry placeholders now." },
      map_editor: { map_spec_ready: true },
      balance_editor: { tuning_knobs_from_modules: true }
    }
  };
}

function detectGameplayTheme(prompt) {
  const match = themeKeywords.find(([keyword]) => prompt.includes(keyword));
  return {
    setting: match?.[1] || "generic",
    visual_style: "greybox_only",
    placeholder_style: "geometry_or_placeholder_sprites",
    notes: match?.[2] || "未指定题材，仅生成玩法骨架。"
  };
}

function detectGameplayLoops(prompt, kb) {
  const scored = kb.core_loops
    .map((loop) => {
      const result = scoreGameplayLoop(prompt, loop);
      return result ? { id: loop.id, position: result.position, score: result.score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.position - b.position || b.score - a.score);
  return uniqueKeepOrder(scored.map((item) => item.id)).length ? uniqueKeepOrder(scored.map((item) => item.id)) : ["core_loop.wave_defense"];
}

function scoreGameplayLoop(prompt, loop) {
  if (!loop) return null;
  const text = prompt.toLowerCase();
  const candidates = [];
  (loop.aliases || []).forEach((alias) => {
    const value = String(alias).toLowerCase();
    const index = text.indexOf(value);
    if (index >= 0) candidates.push({ position: index, score: 1000 + value.length * 3 });
  });
  (loop.best_for || []).forEach((tag) => {
    const value = String(tag).toLowerCase().replaceAll("_", " ");
    const index = text.indexOf(value);
    if (index >= 0) candidates.push({ position: index, score: 500 + value.length });
  });
  const name = String(loop.name || "").toLowerCase();
  const nameIndex = text.indexOf(name);
  if (nameIndex >= 0) candidates.push({ position: nameIndex, score: 800 + name.length });
  return candidates.sort((a, b) => a.position - b.position || b.score - a.score)[0] || null;
}

function detectGameplayBlueprints(prompt, kb) {
  const text = prompt.toLowerCase();
  const existing = new Set(kb.blueprints.map((item) => item.id));
  return uniqueKeepOrder(
    Object.entries(blueprintAliases)
      .filter(([id, aliases]) => existing.has(id) && aliases.some((alias) => text.includes(alias.toLowerCase())))
      .map(([id]) => id)
  );
}

function findGameplayFusionRule(kb, primary, secondary) {
  if (!secondary) return null;
  return (
    kb.fusion_rules.find((rule) => rule.primary_loop === primary && rule.secondary_loop === secondary) ||
    kb.fusion_rules.find((rule) => rule.primary_loop === secondary && rule.secondary_loop === primary) ||
    null
  );
}

function deriveGameplayModules(kb, primaryLoop, secondaryLoops, blueprintIds, fusionRule, prompt) {
  const modules = [];
  blueprintIds.forEach((id) => {
    const blueprint = getKbItem(kb.blueprints, id);
    if (blueprint?.primary_loop === primaryLoop) modules.push(...(blueprint.core_modules || []));
  });
  modules.push(...(getKbItem(kb.core_loops, primaryLoop)?.required_modules || []));
  if (!fusionRule) {
    secondaryLoops.forEach((id) => modules.push(...(getKbItem(kb.core_loops, id)?.required_modules || []).slice(0, 4)));
  }
  if (fusionRule) {
    modules.push(...(fusionRule.add_modules || []));
    (fusionRule.remove_or_limit_modules || []).forEach((id) => {
      const index = modules.indexOf(id);
      if (index >= 0) modules.splice(index, 1);
    });
  }
  if (prompt.includes("三国") && ["core_loop.wave_defense", "core_loop.survival_growth", "core_loop.tactical_turn"].includes(primaryLoop)) modules.push("module.hero_control");
  if (/boss|首领|武将/i.test(prompt)) modules.push("module.boss_wave");
  if (/肉鸽|rogue|随机/i.test(prompt)) modules.push("module.random_upgrade_choice");
  return uniqueKeepOrder(modules);
}

function collectGameplayEntities(kb, moduleIds, primaryLoop, theme) {
  const lookup = new Map(kb.modules.map((item) => [item.id, item]));
  const entities = [];
  const seen = new Set();
  moduleIds.forEach((id) => {
    (lookup.get(id)?.default_entities || []).forEach((entity) => {
      if (seen.has(entity.id)) return;
      seen.add(entity.id);
      entities.push({ ...entity });
    });
  });
  if (primaryLoop === "core_loop.wave_defense" && !seen.has("player_base")) entities.push({ id: "player_base", type: "base", shape: "square", stats: { hp: 20 } });
  if (primaryLoop === "core_loop.survival_growth" && !seen.has("player")) entities.push({ id: "player", type: "player", shape: "capsule", stats: { hp: 20, speed: 4 } });
  if (theme.setting === "three_kingdoms") {
    entities.forEach((entity) => {
      if (entity.id === "hero") entity.theme_role = "general";
      if (entity.type === "enemy") entity.theme_role = "soldier";
      if (entity.type === "tower") entity.theme_role = "war_banner_or_turret";
    });
  }
  return entities;
}

function makeGameplayModuleEntries(kb, moduleIds) {
  const lookup = new Map(kb.modules.map((item) => [item.id, item]));
  return moduleIds.map((id) => ({ id, config: lookup.get(id)?.default_params || {} })).filter((item) => lookup.has(item.id));
}

function deriveGameplayActions(moduleIds) {
  return uniqueKeepOrder(moduleIds.flatMap((id) => actionByModule[id] || [])).length ? uniqueKeepOrder(moduleIds.flatMap((id) => actionByModule[id] || [])) : ["click_or_tap"];
}

function deriveGameplayResources(moduleIds) {
  const ids = new Set(moduleIds);
  const resources = [];
  if (["module.reward_system", "module.economy_system", "module.tower_building", "module.shop_system"].some((id) => ids.has(id))) {
    resources.push({ id: "gold", initial: 30, source: "kill_or_round_reward", sink: "build_upgrade_or_shop" });
  }
  if (ids.has("module.exp_drop")) resources.push({ id: "exp", initial: 0, source: "enemy_drop", sink: "level_up" });
  if (ids.has("module.energy_system")) resources.push({ id: "energy", initial: 3, source: "turn_start", sink: "play_card_or_action" });
  if (ids.has("module.score_multiplier")) resources.push({ id: "score", initial: 0, source: "card_or_combo_result", sink: "round_target" });
  return resources;
}

function deriveGameplayMapSpec(primaryLoop, moduleIds) {
  const ids = new Set(moduleIds);
  if (primaryLoop === "core_loop.wave_defense") return { type: "path_or_lane_map", lanes: 1, build_points: 6, base_position: "end_of_path", spawn_points: 1 };
  if (primaryLoop === "core_loop.survival_growth") return { type: "arena", size: [40, 40], enemy_spawn: "outside_screen" };
  if (primaryLoop === "core_loop.deck_builder") return { type: "board_ui", areas: ["draw_pile", "hand", "play_area", "discard_pile", "target_area"] };
  if (ids.has("module.board_grid")) return { type: "board_grid", width: 6, height: 4, bench_slots: 6 };
  return { type: "generic_greybox" };
}

function deriveGameplayProgressionSpec(moduleIds, fusionRule) {
  const ids = new Set(moduleIds);
  let spec = { type: "none", notes: "No explicit progression module selected." };
  if (ids.has("module.upgrade_system")) spec = { type: "upgrade_system", upgrade_targets: ["tower_or_unit"], cost_curve: [10, 20, 40] };
  if (ids.has("module.random_upgrade_choice")) spec = { type: "random_upgrade_choice", choice_count: 3, pool: ["damage_up", "range_up", "cooldown_down", "extra_projectile"] };
  if (ids.has("module.card_system")) spec = { type: "card_or_modifier_progression", card_pool_size: 12, reward_choices: 3 };
  if (fusionRule?.default_params) spec.fusion_params = fusionRule.default_params;
  return spec;
}

function makeGameplayTitle(theme, primaryName, secondaryNames) {
  const prefix = theme.setting === "three_kingdoms" ? "三国" : "Greybox";
  return secondaryNames.length ? `${prefix} ${primaryName} × ${secondaryNames[0]} Skeleton` : `${prefix} ${primaryName} Skeleton`;
}

function getKbItem(items, id) {
  return (items || []).find((item) => item.id === id) || null;
}

function uniqueKeepOrder(items) {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}

function simpleHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(10, "0");
}

function validateGameplaySkeleton(skeleton) {
  const required = ["schema_version", "project_id", "title", "user_prompt", "theme", "primary_loop", "loop_steps", "modules", "entities", "player_actions", "win_condition", "fail_condition", "map_spec", "progression_spec"];
  return required.filter((key) => skeleton[key] === undefined || skeleton[key] === null);
}

function resetGameplayRuntime() {
  state.gameplayRuntime = createGameplayRuntime(activeGameplayExperiment());
}

function createGameplayRuntime(experiment) {
  const mode = gameplayAdapterMode(experiment);
  if (mode === "wave_defense") return createWaveDefenseRuntime(experiment);
  if (mode === "survival_growth") return createSurvivalGrowthRuntime(experiment);
  if (mode === "deck_builder") return createDeckBuilderRuntime(experiment);
  return createUnsupportedGameplayRuntime(experiment);
}

function createWaveDefenseRuntime(experiment) {
  const runtime = createInitialGameplayRuntime();
  const skeleton = experiment?.skeleton || state.gameplaySkeleton;
  const config = experiment?.runtimeConfig || createGameplayRuntimeConfig(state.gameplayTuning);
  runtime.mode = "wave_defense";
  runtime.fusion.ruleSpec = experiment?.ruleSpec || gameplayRuleSpec(experiment?.fusionTemplate);
  runtime.baseHp = skeleton?.entities?.find((entity) => entity.type === "base")?.stats?.hp || 20;
  runtime.gold = config.resources.initialGold;
  runtime.spawnIntervalBase = config.pressure.spawnInterval;
  runtime.enemyHpMultiplier = config.pressure.hpMultiplier * fusionEnemyHpMultiplier(experiment);
  runtime.enemySpeedMultiplier = config.pressure.speedMultiplier;
  runtime.killReward = config.resources.killReward;
  runtime.expPerKill = config.growth.expPerKill;
  runtime.buildCost = config.resources.buildCost;
  runtime.maxWaves = experiment?.fusionMode === "dual" ? 6 : 5;
  runtime.waveReward = 8 + config.resources.killReward * 4;
  runtime.waveTarget = gameplayWaveTarget(runtime.wave, experiment);
  runtime.heroEnabled = config.hero.enabled || experiment?.secondaryLoop === "core_loop.survival_growth";
  runtime.heroDamageMultiplier = config.hero.damageMultiplier * config.fusionIntensity;
  runtime.hero.mode = experiment?.secondaryLoop === "core_loop.survival_growth" ? "free" : "path";
  const heroStart = pointOnRoute(runtime.route, 0.72);
  runtime.hero.x = heroStart.x;
  runtime.hero.y = heroStart.y;
  runtime.hero.maxHp = runtime.hero.mode === "free" ? 36 : 42;
  runtime.hero.hp = runtime.hero.maxHp;
  const initialTowerCount = config.resources.initialTowers;
  runtime.buildPoints = createGameplayBuildPoints(runtime.route, skeleton?.map_spec?.build_points || 6, initialTowerCount);
  runtime.towers = runtime.buildPoints.slice(0, initialTowerCount).map((point, index) => createGameplayTower(point, index));
  setupWaveDefenseFusion(runtime, experiment);
  runtime.spawnTimer = runtime.spawnIntervalBase;
  runtime.message = waveDefenseFusionMessage(experiment, config);
  return runtime;
}

function setupWaveDefenseFusion(runtime, experiment) {
  if (experiment?.secondaryLoop === "core_loop.survival_growth") {
    setupWaveDefenseSurvivalFusion(runtime, experiment);
    return;
  }
  if (experiment?.secondaryLoop !== "core_loop.deck_builder") {
    runtime.cards = [];
    runtime.fusion.mode = "none";
    return;
  }
  runtime.fusion.mode = experiment.fusionTemplate;
  if (experiment.fusionTemplate === "wave_tactic_cards") {
    runtime.waveState = "planning";
    runtime.running = false;
    runtime.fusion.pendingChoice = true;
    runtime.cards = createWaveTacticCards(runtime.wave);
    return;
  }
  if (experiment.fusionTemplate === "build_cards") {
    const fusionTuning = experiment.runtimeConfig?.fusionTuning || createFusionTuningProfile(experiment.tuning || state.gameplayTuning, experiment.runtimeConfig?.tuningScales || {});
    runtime.fusion.maxEnergy = 0;
    runtime.fusion.maxHand = fusionTuning.buildHandSize;
    runtime.fusion.drawPile = shuffleCards(createWaveBuildDeck(runtime.wave));
    drawWaveBuildCards(runtime, fusionTuning.buildHandSize);
    return;
  }
  if (experiment.fusionTemplate === "risk_contract") {
    runtime.waveState = "planning";
    runtime.running = false;
    runtime.fusion.pendingChoice = true;
    runtime.cards = createWaveRiskContracts(runtime.wave);
    return;
  }
  runtime.cards = createGameplayCards();
}

function setupWaveDefenseSurvivalFusion(runtime, experiment) {
  const heroPower = experiment?.runtimeConfig?.tuningScales?.heroPower || 1;
  runtime.cards = [];
  runtime.fusion.mode = experiment?.fusionTemplate || "free_hero_rescue";
  runtime.heroEnabled = true;
  runtime.hero.mode = "free";
  runtime.hero.maxHp = Math.round((runtime.fusion.mode === "surround_zone_defense" ? 34 : 42) * clamp(0.65 + heroPower * 0.35, 0.35, 1.4));
  runtime.hero.hp = runtime.hero.maxHp;
  runtime.hero.x = MAP_WIDTH * 0.56;
  runtime.hero.y = MAP_HEIGHT * 0.62;
  runtime.heroDamageMultiplier *= runtime.fusion.mode === "hero_growth_defense" ? 0.95 : 1.12;
  runtime.fusion.survivalSpawnTimer = runtime.fusion.mode === "surround_zone_defense" ? 1.4 : 3.2;
  runtime.fusion.survivalSpawnInterval = runtime.fusion.mode === "surround_zone_defense" ? 4.1 : 6.4;
  runtime.fusion.heroGrowthWave = 0;
  runtime.fusion.heroGrowthThreshold = runtime.fusion.mode === "hero_growth_defense" ? 8 : 999;
  if (runtime.fusion.mode === "hero_growth_defense") runtime.expPerKill *= 0.45;
  runtime.message = {
    free_hero_rescue: "侧翼袭扰出现，拖动英雄全场救火",
    surround_zone_defense: "敌群会追击英雄，基地和英雄都不能失守",
    hero_growth_defense: "英雄击杀掉经验，升级会反哺防线"
  }[runtime.fusion.mode] || "英雄加入防守";
}

function waveDefenseFusionMessage(experiment, config) {
  if (experiment?.secondaryLoop === "core_loop.survival_growth") {
    return {
      free_hero_rescue: "侧翼袭扰出现，拖动英雄全场救火",
      surround_zone_defense: "敌群会追击英雄，基地和英雄都不能失守",
      hero_growth_defense: "英雄击杀掉经验，升级会反哺防线"
    }[experiment?.fusionTemplate] || "英雄加入防守";
  }
  if (experiment?.secondaryLoop !== "core_loop.deck_builder") {
    return "准备开战";
  }
  return {
    wave_tactic_cards: "选择一张波前战术牌后开始本波",
    build_cards: "用手牌建造、升级或获得经济，牌会循环进入弃牌堆",
    risk_contract: "选择一张风险契约后开始本波"
  }[experiment?.fusionTemplate] || "选择关系卡后开始";
}

function createSurvivalGrowthRuntime(experiment) {
  const runtime = createInitialGameplayRuntime();
  const config = experiment?.runtimeConfig || createGameplayRuntimeConfig(state.gameplayTuning);
  const fusionTuning = config.fusionTuning || createFusionTuningProfile(experiment?.tuning || state.gameplayTuning, config.tuningScales || {});
  const heroPower = config.tuningScales?.heroPower || 1;
  runtime.mode = "survival_growth";
  runtime.fusion.ruleSpec = experiment?.ruleSpec || gameplayRuleSpec(experiment?.fusionTemplate);
  runtime.baseHp = 0;
  runtime.gold = config.resources.initialGold;
  runtime.spawnIntervalBase = config.pressure.spawnInterval * 0.75;
  runtime.enemyHpMultiplier = config.pressure.hpMultiplier;
  runtime.enemySpeedMultiplier = config.pressure.speedMultiplier;
  runtime.killReward = config.resources.killReward;
  runtime.expPerKill = config.growth.expPerKill;
  runtime.runGoalSeconds = experiment?.fusionMode === "dual" ? 120 : 90;
  runtime.heroEnabled = true;
  runtime.player = {
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    hp: Math.round(30 * clamp(0.7 + heroPower * 0.3, 0.45, 1.4)),
    maxHp: Math.round(30 * clamp(0.7 + heroPower * 0.3, 0.45, 1.4)),
    speed: 220 * clamp(0.82 + heroPower * 0.18, 0.65, 1.25),
    attackRange: (120 + (experiment?.fusionMode === "dual" ? 40 : 0)) * clamp(0.85 + heroPower * 0.15, 0.7, 1.25),
    cooldown: 0,
    damage: 5 * config.fusionIntensity * clamp(0.7 + heroPower * 0.3, 0.45, 1.55),
    level: 1,
    cooldownBase: 0.55
  };
  runtime.fusion.cardPower = fusionTuning.cardPower;
  setupSurvivalFusion(runtime, experiment);
  runtime.message = survivalFusionMessage(experiment);
  return runtime;
}

function setupSurvivalFusion(runtime, experiment) {
  if (experiment?.secondaryLoop === "core_loop.wave_defense") {
    setupSurvivalTowerFusion(runtime, experiment);
    return;
  }
  setupSurvivalCardFusion(runtime, experiment);
}

function setupSurvivalCardFusion(runtime, experiment) {
  const fusionTuning = experiment?.runtimeConfig?.fusionTuning || createFusionTuningProfile(experiment?.tuning || state.gameplayTuning, experiment?.runtimeConfig?.tuningScales || {});
  if (experiment?.secondaryLoop !== "core_loop.deck_builder") {
    runtime.cards = [];
    runtime.fusion.mode = "none";
    return;
  }
  runtime.fusion.mode = experiment.fusionTemplate;
  if (experiment.fusionTemplate === "cards_as_active_skills" || experiment.fusionTemplate === "cards_as_growth_choices") {
    runtime.fusion.maxEnergy = Math.max(1, (experiment.fusionTemplate === "cards_as_growth_choices" ? 4 : 3) + fusionTuning.energyCapBonus);
    runtime.fusion.energy = Math.min(runtime.fusion.maxEnergy, Math.max(1, Math.round(2 * fusionTuning.resourceSupport)));
    runtime.fusion.maxHand = fusionTuning.maxHand;
    runtime.fusion.drawInterval = (experiment.fusionTemplate === "cards_as_growth_choices" ? 9 : 7) * fusionTuning.drawIntervalMultiplier;
    runtime.fusion.drawTimer = runtime.fusion.drawInterval;
    runtime.fusion.drawPerTrigger = fusionTuning.drawPerTrigger;
    runtime.fusion.killDrawInterval = fusionTuning.killDrawInterval;
    runtime.fusion.energyPerKill = fusionTuning.energyPerKill;
    runtime.fusion.energyBank = 0;
    runtime.fusion.cardPower = fusionTuning.cardPower;
    runtime.fusion.pendingHeroGrowth = null;
    runtime.fusion.pendingDeckBuild = null;
    runtime.fusion.drawPile = shuffleCards(createSurvivalCardDeck(experiment));
    drawSurvivalFusionCards(runtime, fusionTuning.startingHand);
    runtime.cards = runtime.fusion.hand;
    return;
  }
  if (experiment.fusionTemplate === "risk_event_cards" || experiment.fusionTemplate === "risk_contract") {
    runtime.fusion.maxEnergy = 0;
    runtime.fusion.energy = 0;
    runtime.fusion.mode = "risk_event_cards";
    runtime.cards = createSurvivalRiskContracts();
    return;
  }
  runtime.fusion.maxEnergy = 0;
  runtime.fusion.energy = 0;
  runtime.cards = createGameplayCards().slice(0, 2);
}

function setupSurvivalTowerFusion(runtime, experiment) {
  const config = experiment?.runtimeConfig || createGameplayRuntimeConfig(state.gameplayTuning);
  const scales = config.tuningScales || {};
  const resourceScale = scales.resourceGenerosity || 1;
  const buildScale = scales.constructionCost || 1;
  const heroPower = scales.heroPower || 1;
  runtime.fusion.mode = experiment?.fusionTemplate || "portable_turret_ring";
  runtime.fusion.deployCost = Math.max(2, Math.round(4 * buildScale));
  runtime.fusion.parts = Math.max(runtime.fusion.deployCost, Math.round(3 * resourceScale));
  runtime.fusion.turrets = [];
  runtime.fusion.barricades = [];
  runtime.fusion.skillCharges = Math.max(1, Math.round(2 * resourceScale));
  runtime.fusion.skillChargeMax = Math.max(3, Math.round(4 + resourceScale));
  runtime.fusion.turretDuration = runtime.fusion.mode === "portable_turret_ring" ? 18 : 9;
  runtime.fusion.turretDamage = 4.2 * clamp(0.75 + heroPower * 0.25, 0.55, 1.55);
  runtime.fusion.base = null;
  runtime.cards = [];
  if (runtime.fusion.mode === "survival_base_zone") {
    runtime.fusion.base = {
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT / 2 + 190,
      hp: Math.round(38 * clamp(0.7 + resourceScale * 0.3, 0.55, 1.45)),
      maxHp: Math.round(38 * clamp(0.7 + resourceScale * 0.3, 0.55, 1.45)),
      level: 1,
      range: 190,
      cooldown: 0,
      damage: 4.8 * clamp(0.75 + heroPower * 0.25, 0.55, 1.55)
    };
    runtime.player.x = MAP_WIDTH / 2;
    runtime.player.y = MAP_HEIGHT / 2 + 40;
  }
  if (runtime.fusion.mode === "tower_skill_loadout") {
    runtime.cards = createSurvivalTowerSkillCards();
  }
}

function survivalFusionMessage(experiment) {
  if (experiment?.secondaryLoop === "core_loop.wave_defense") {
    return {
      portable_turret_ring: "试玩：击杀拿零件，点击角色附近部署临时炮台",
      survival_base_zone: "试玩：保护据点，点击据点可消耗零件修复/升级",
      tower_skill_loadout: "试玩：击杀充能，点击底部防线技能释放"
    }[experiment?.fusionTemplate] || "试玩：幸存者 + 塔防";
  }
  if (experiment?.secondaryLoop !== "core_loop.deck_builder") return "试玩：WASD移动 · 自动攻击 · 拾取经验";
  return `试玩：${activeGameplayFusionTemplate(experiment).label} · ${activeGameplayFusionTemplate(experiment).description}`;
}

function createDeckBuilderRuntime(experiment) {
  const runtime = createInitialGameplayRuntime();
  const config = experiment?.runtimeConfig || createGameplayRuntimeConfig(state.gameplayTuning);
  runtime.mode = "deck_builder";
  runtime.fusion.ruleSpec = experiment?.ruleSpec || gameplayRuleSpec(experiment?.fusionTemplate);
  runtime.enemyHpMultiplier = config.pressure.hpMultiplier;
  const deckCards = createDeckBuilderDeck(experiment);
  runtime.deck = {
    playerHp: 30,
    enemyHp: 42 * config.pressure.hpMultiplier,
    enemyMaxHp: 42 * config.pressure.hpMultiplier,
    energy: deckBuilderTurnEnergy(runtime, experiment),
    turn: 1,
    block: 0,
    score: 0,
    encounter: 1,
    drawPile: shuffleCards(deckCards),
    discardPile: [],
    hand: [],
    rewardChoices: [],
    enemyIntent: createDeckEnemyIntent(1, config.pressure.hpMultiplier),
    status: "playing",
    discardMode: false,
    discardUsedThisTurn: false
  };
  setupDeckBuilderFusion(runtime, experiment, config);
  drawDeckCards(runtime.deck, 5);
  runtime.gold = config.resources.initialGold;
  runtime.cards = runtime.deck.hand;
  runtime.message = deckBuilderFusionMessage(experiment);
  return runtime;
}

function deckBuilderTurnEnergy(runtime = state.gameplayRuntime, experiment = activeGameplayExperiment()) {
  let energy = experiment?.fusionMode === "dual" ? 4 : 3;
  if (runtime?.fusion?.deckRelics?.some((relic) => relic.type === "energy")) energy += 1;
  return energy;
}

function setupDeckBuilderFusion(runtime, experiment, config) {
  const scales = config?.tuningScales || {};
  const rewardScale = scales.cardRewardScale || 1;
  const riskScale = scales.riskPenaltyScale || 1;
  runtime.fusion.mode = experiment?.fusionTemplate || "pure_card_encounters";
  runtime.fusion.deckTowers = [];
  runtime.fusion.deckRelics = [];
  runtime.fusion.deckUnits = [];
  runtime.fusion.routeEvent = null;
  runtime.fusion.survivalPressure = 0;
  runtime.fusion.baseHp = Math.round(20 * clamp(0.7 + (scales.resourceGenerosity || 1) * 0.3, 0.55, 1.6));
  runtime.fusion.baseMaxHp = runtime.fusion.baseHp;
  runtime.fusion.towerPower = clamp(0.75 + rewardScale * 0.25, 0.65, 1.65);
  runtime.fusion.riskScale = riskScale;
  if (experiment?.secondaryLoop === "core_loop.wave_defense") {
    if (experiment.fusionTemplate === "defense_relics") {
      runtime.fusion.deckRelics.push({ id: "starter_wall", name: "旧城墙", type: "base", value: 4 });
      runtime.fusion.baseHp += 4;
      runtime.fusion.baseMaxHp += 4;
    }
    if (experiment.fusionTemplate === "route_event_cards") {
      runtime.deck.status = "route_event";
      runtime.deck.rewardChoices = createDeckRouteEventChoices();
      runtime.message = "试玩：先选择本场路线事件";
    }
    return;
  }
  if (experiment?.secondaryLoop === "core_loop.survival_growth") {
    runtime.fusion.survivalPressure = experiment.fusionTemplate === "survival_turn_cards" ? 2 : 1;
    if (experiment.fusionTemplate === "summon_deck_flow") {
      runtime.fusion.deckUnits.push(createDeckSummonUnit("先锋", 4 * rewardScale, 3));
    }
  }
}

function deckBuilderFusionMessage(experiment) {
  if (experiment?.secondaryLoop === "core_loop.wave_defense") {
    return {
      card_build_lane: "试玩：打出建塔/升级牌，让防线每回合自动输出",
      defense_relics: "试玩：击败敌人后选择防线遗物，形成长期被动规则",
      route_event_cards: "试玩：每场先选路线事件，再进入牌局战斗"
    }[experiment?.fusionTemplate] || "试玩：卡牌 + 塔防";
  }
  if (experiment?.secondaryLoop === "core_loop.survival_growth") {
    return {
      auto_battle_deck: "试玩：召唤伙伴自动战斗，单位会攻击并吸收伤害",
      survival_turn_cards: "试玩：用闪避、清场、恢复牌处理每回合包围压力",
      summon_deck_flow: "试玩：围绕召唤物构筑，保持前排不断档"
    }[experiment?.fusionTemplate] || "试玩：卡牌 + 幸存者";
  }
  return "试玩：点击卡牌出牌，击败敌人后选择奖励牌";
}

function createUnsupportedGameplayRuntime(experiment) {
  const runtime = createInitialGameplayRuntime();
  runtime.mode = "unsupported";
  runtime.supported = false;
  runtime.running = false;
  runtime.placeholder = {
    title: `${primaryLoopLabel(experiment?.primaryLoop)}暂未支持试玩`,
    body: "当前 v1 只支持塔防、幸存者、卡牌，以及它们之间的融合。"
  };
  runtime.message = "试玩：当前玩法组合暂未支持";
  return runtime;
}

function spawnGameplayVfx(type, x, y, options = {}) {
  const runtime = state.gameplayRuntime;
  if (!runtime?.vfx) return null;
  const life = options.life || (type === "beam" ? 0.28 : type === "pulse" ? 0.42 : 0.85);
  const item = {
    id: nextId("vfx"),
    type,
    x,
    y,
    startX: options.startX ?? x,
    startY: options.startY ?? y,
    endX: options.endX ?? x,
    endY: options.endY ?? y,
    text: options.text || "",
    color: options.color || "#f59e0b",
    bg: options.bg || "rgba(15, 23, 42, 0.84)",
    radius: options.radius || 34,
    size: options.size || 16,
    life,
    maxLife: life,
    dx: options.dx || 0,
    dy: options.dy ?? (type === "float" ? -34 : 0)
  };
  runtime.vfx.push(item);
  return item;
}

function spawnFloatVfx(x, y, text, color = "#f59e0b", options = {}) {
  return spawnGameplayVfx("float", x, y, { ...options, text, color });
}

function spawnPulseVfx(x, y, color = "#f59e0b", options = {}) {
  return spawnGameplayVfx("pulse", x, y, { ...options, color });
}

function spawnBeamVfx(start, end, color = "#f59e0b", options = {}) {
  if (!start || !end) return null;
  return spawnGameplayVfx("beam", end.x, end.y, {
    ...options,
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    color
  });
}

function spawnDamageVfx(target, amount, options = {}) {
  if (!target) return;
  const value = Math.max(0, Math.round(amount || 0));
  if (value > 0 || options.text) spawnFloatVfx(target.x, target.y - 24, options.text || `-${value}`, options.color || "#ef4444", options);
  spawnPulseVfx(target.x, target.y, options.color || "#ef4444", { radius: options.radius || 30, life: 0.35 });
}

function spawnHealVfx(target, amount, options = {}) {
  if (!target) return;
  const value = Math.max(0, Math.round(amount || 0));
  if (value > 0 || options.text) spawnFloatVfx(target.x, target.y - 24, options.text || `+${value}`, options.color || "#22c55e", options);
  spawnPulseVfx(target.x, target.y, options.color || "#22c55e", { radius: options.radius || 30, life: 0.35 });
}

function updateGameplayVfxTick(now = performance.now()) {
  const runtime = state.gameplayRuntime;
  if (!runtime?.vfx) return;
  const delta = Math.min(0.08, Math.max(0, (now - (runtime.vfxLastUpdate || now)) / 1000));
  runtime.vfxLastUpdate = now;
  updateGameplayVfx(delta);
}

function updateGameplayVfx(delta) {
  const runtime = state.gameplayRuntime;
  if (!runtime?.vfx?.length) return;
  runtime.vfx.forEach((item) => {
    item.life -= delta;
    const progress = 1 - Math.max(0, item.life) / item.maxLife;
    item.x += item.dx * delta;
    item.y += item.dy * delta;
    if (item.type === "pulse") item.currentRadius = item.radius * (0.4 + progress * 0.9);
  });
  runtime.vfx = runtime.vfx.filter((item) => item.life > 0);
}

function drawGameplayVfx(ctx) {
  const runtime = state.gameplayRuntime;
  if (!runtime?.vfx?.length) return;
  runtime.vfx.forEach((item) => {
    const alpha = clamp(item.life / item.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha * 1.05);
    if (item.type === "beam") {
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(item.startX, item.startY);
      ctx.lineTo(item.endX, item.endY);
      ctx.stroke();
      ctx.globalAlpha = Math.min(0.45, alpha * 0.45);
      ctx.lineWidth = 12;
      ctx.stroke();
    } else if (item.type === "pulse") {
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.currentRadius || item.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (item.type === "float") {
      const fontSize = Math.max(item.size || 0, miniGameUi.font.caption);
      ctx.font = miniGameFont(fontSize, 800);
      const pad = Math.round(fontSize * 0.8);
      const height = fontSize + 18;
      const width = Math.max(44, ctx.measureText(item.text).width + pad * 2);
      drawMiniGamePanel(ctx, item.x - width / 2, item.y - height + 6, width, height, {
        radius: miniGameUi.radius.pill,
        fill: item.bg,
        stroke: "rgba(255, 255, 255, 0.22)"
      });
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x - width / 2 + pad, item.y - 9);
    }
    ctx.restore();
  });
}

function hasGameplayModule(id) {
  return Boolean(state.gameplaySkeleton?.modules?.some((module) => module.id === id));
}

function createGameplayBuildPoints(route, count, occupiedCount = 0) {
  return Array.from({ length: count }, (_, index) => {
    const base = route[Math.min(route.length - 2, Math.max(0, Math.floor((index / count) * (route.length - 1))))];
    const side = index % 2 === 0 ? -1 : 1;
    return {
      x: clamp(base.x + side * (72 + (index % 3) * 18), 70, MAP_WIDTH - 70),
      y: clamp(base.y + 80 + (index % 2) * 60, 130, MAP_HEIGHT - 160),
      occupied: index < occupiedCount
    };
  });
}

function createGameplayTower(point, index, forcedType = null) {
  const catalog = gameplayTowerCatalog();
  const type = catalog.find((item) => item.id === forcedType) || catalog[index % catalog.length];
  return {
    id: `tower-${index}`,
    type: type.id,
    name: type.name,
    x: point.x,
    y: point.y,
    range: type.range,
    damage: type.damage,
    cooldown: 0,
    fireRate: type.fireRate,
    level: 1,
    maxLevel: 3,
    upgradeCost: type.upgradeCost,
    color: type.color
  };
}

function applyWaveTacticCard(card) {
  const runtime = state.gameplayRuntime;
  if (card.type === "wave_gold") runtime.gold += card.value;
  if (card.type === "wave_reward") runtime.killReward += card.value;
  if (card.type === "wave_fortify") {
    runtime.towers.forEach((tower) => {
      tower.damage *= card.value;
      tower.range += 16;
    });
  }
  if (card.type === "wave_rapid") {
    runtime.towers.forEach((tower) => {
      tower.fireRate = Math.max(0.32, tower.fireRate * card.value);
    });
  }
  if (card.type === "wave_weaken") {
    runtime.enemyHpMultiplier *= card.value;
    runtime.spawnIntervalBase *= 1.12;
  }
  if (card.type === "wave_slow") runtime.cardBonus.slow *= card.value;
  runtime.fusion.pendingChoice = false;
  spawnFloatVfx(MAP_WIDTH / 2, 188, card.name.replace(/：.*/, ""), "#facc15", { size: 15 });
  spawnPulseVfx(MAP_WIDTH / 2, 250, "#facc15", { radius: 74 });
  runtime.message = `试玩：${card.name} 已选择，第 ${runtime.wave} 波开始`;
  if (runtime.waveState === "planning") startPlannedGameplayWave();
}

function applyWaveRiskContract(card) {
  const runtime = state.gameplayRuntime;
  const riskScale = card.riskScale || activeGameplayExperiment()?.runtimeConfig?.tuningScales?.riskPenaltyScale || 1;
  if (card.type === "wave_risk_gold") {
    runtime.gold += card.value;
    runtime.fusion.risk.extraEnemies += Math.max(1, Math.round(2 * riskScale));
  }
  if (card.type === "wave_risk_damage") {
    runtime.towers.forEach((tower) => (tower.damage *= card.value));
    runtime.fusion.risk.speedMultiplier *= 1 + 0.14 * riskScale;
  }
  if (card.type === "wave_risk_reward") {
    runtime.waveReward = Math.round(runtime.waveReward * card.value);
    runtime.fusion.risk.leakDamage += Math.max(1, Math.round(riskScale));
    runtime.fusion.risk.hpMultiplier *= 1 + 0.12 * riskScale;
  }
  if (card.type === "wave_risk_elite") {
    runtime.killReward += 1;
    runtime.fusion.risk.hpMultiplier *= card.value;
  }
  if (card.type === "wave_risk_speed") {
    runtime.score += card.value;
    runtime.fusion.risk.speedMultiplier *= 1 + 0.18 * riskScale;
  }
  runtime.fusion.pendingChoice = false;
  spawnFloatVfx(MAP_WIDTH / 2, 188, card.name.replace(/：.*/, ""), "#f97316", { size: 15 });
  spawnPulseVfx(MAP_WIDTH / 2, 250, "#f97316", { radius: 82 });
  runtime.message = `试玩：${card.name} 生效，收益提高但下一波更危险`;
  if (runtime.waveState === "planning") startPlannedGameplayWave();
}

function startPlannedGameplayWave() {
  const runtime = state.gameplayRuntime;
  runtime.waveSpawned = 0;
  runtime.waveTarget = gameplayWaveTarget(runtime.wave, activeGameplayExperiment()) + runtime.fusion.risk.extraEnemies;
  runtime.waveState = "spawning";
  runtime.running = true;
  runtime.spawnTimer = 0.25;
}

function gameplayTowerCatalog() {
  return [
    { id: "arrow", name: "箭楼", role: "低费快攻，适合补漏", cost: 9, damage: 5, range: 150, fireRate: 0.85, upgradeCost: 12, color: "#2563eb" },
    { id: "crossbow", name: "重弩", role: "高单体，适合打重甲", cost: 13, damage: 9, range: 178, fireRate: 1.25, upgradeCost: 16, color: "#7c3aed" },
    { id: "oil", name: "火油", role: "中距压制，适合清群", cost: 11, damage: 7, range: 132, fireRate: 1.05, upgradeCost: 14, color: "#f97316" }
  ];
}

function createTowerUpgradeOptions(tower) {
  const upgradeScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.upgradeCostScale || 1;
  return [
    { id: "level", name: "升等级", cost: Math.round(tower.upgradeCost * tower.level * upgradeScale), detail: "伤害大幅提高，射程小幅提高" },
    { id: "range", name: "扩射程", cost: Math.round((7 + tower.level * 3) * upgradeScale), detail: "提高覆盖范围，适合补盲区" },
    { id: "rapid", name: "提攻速", cost: Math.round((8 + tower.level * 3) * upgradeScale), detail: "提高出手频率，适合清快兵" }
  ];
}

function applyTowerBuildOption(pointSlot, option) {
  const runtime = state.gameplayRuntime;
  if (runtime.gold < option.cost) {
    runtime.message = `试玩：金币不足，${option.name} 需要 ${option.cost}`;
    return;
  }
  pointSlot.occupied = true;
  runtime.gold -= option.cost;
  const tower = createGameplayTower(pointSlot, runtime.towers.length, option.towerType);
  runtime.towers.push(tower);
  spawnFloatVfx(pointSlot.x, pointSlot.y - 40, `建造${option.name}`, "#2563eb");
  spawnPulseVfx(pointSlot.x, pointSlot.y, "#2563eb", { radius: 42 });
  runtime.message = `试玩：已建造 ${option.name}`;
}

function applyTowerUpgradeOption(tower, option) {
  const runtime = state.gameplayRuntime;
  if (runtime.gold < option.cost) {
    runtime.message = `试玩：金币不足，${option.name} 需要 ${option.cost}`;
    return;
  }
  if (option.id === "level" && tower.level >= tower.maxLevel) {
    runtime.message = `试玩：${tower.name} 已满级`;
    return;
  }
  runtime.gold -= option.cost;
  if (option.id === "level") {
    tower.level += 1;
    tower.damage = Math.round(tower.damage * 1.42);
    tower.range += 18;
    tower.fireRate = Math.max(0.35, tower.fireRate * 0.92);
  }
  if (option.id === "range") tower.range += 32;
  if (option.id === "rapid") tower.fireRate = Math.max(0.32, tower.fireRate * 0.76);
  spawnFloatVfx(tower.x, tower.y - 42, option.name, "#2563eb");
  spawnPulseVfx(tower.x, tower.y, "#2563eb", { radius: 42 });
  runtime.message = `试玩：${tower.name} 已${option.name}`;
}

function gameplayWaveTarget(wave, experiment) {
  const base = 7 + wave * 3;
  const fusionBonus = experiment?.secondaryLoop === "core_loop.survival_growth" ? 2 : 0;
  return Math.round(base + fusionBonus);
}

function createGameplayCards() {
  if (!gameplayUsesCards()) return [];
  const impact = state.gameplayTuning.cardImpact;
  const experiment = activeGameplayExperiment();
  const cardSets = {
    gold: [
      { id: "gold", name: "资源牌：金币+18", type: "gold" },
      { id: "discount", name: "资源牌：下次建塔-5", type: "discount" },
      { id: "reward", name: "资源牌：击杀奖励+1", type: "reward" }
    ],
    tower: [
      { id: "damage", name: "塔牌：火力+25%", type: "damage" },
      { id: "range", name: "塔牌：射程+20%", type: "range" },
      { id: "rapid", name: "塔牌：攻速+20%", type: "rapid" }
    ],
    enemy: [
      { id: "slow", name: "敌军牌：敌速-20%", type: "slow" },
      { id: "weaken", name: "敌军牌：敌血-20%", type: "weaken" },
      { id: "delay", name: "敌军牌：出兵变慢", type: "delay" }
    ],
    hero: [
      { id: "hero_damage", name: "英雄牌：伤害+40%", type: "hero_damage" },
      { id: "hero_core", name: "英雄牌：参与度提升", type: "hero_core" },
      { id: "hero_gold", name: "英雄牌：近战击杀给金币", type: "gold" }
    ]
  };
  const cards = [...(cardSets[impact] || cardSets.tower)];
  if (experiment?.runtimeConfig?.goalCardBonus) {
    cards.push({ id: "choice", name: "选择牌：立即抽取一次增益", type: "damage" });
  }
  return cards;
}

function createWaveTacticCards(wave) {
  const rewardScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.cardRewardScale || 1;
  const choiceCount = activeGameplayExperiment()?.runtimeConfig?.fusionTuning?.waveChoiceCount || 3;
  const pool = [
    { id: "tactic_gold", name: "经济战术：征税", type: "wave_gold", detail: `本波开始前获得 ${Math.round((14 + wave * 2) * rewardScale)} 金币`, value: Math.round((14 + wave * 2) * rewardScale) },
    { id: "tactic_reward", name: "经济战术：悬赏", type: "wave_reward", detail: "本波击杀奖励 +1", value: 1 },
    { id: "tactic_fortify", name: "防线战术：加固", type: "wave_fortify", detail: "本波所有塔伤害和射程提高", value: 1 + 0.22 * rewardScale },
    { id: "tactic_rapid", name: "防线战术：急射", type: "wave_rapid", detail: "本波所有塔攻速提高", value: Math.max(0.45, 1 - 0.22 * rewardScale) },
    { id: "tactic_weaken", name: "控场战术：疑兵", type: "wave_weaken", detail: "本波敌人生命降低，出兵略变慢", value: Math.max(0.55, 1 - 0.14 * rewardScale) },
    { id: "tactic_slow", name: "控场战术：绊马", type: "wave_slow", detail: "本波敌人速度降低", value: Math.max(0.5, 1 - 0.18 * rewardScale) }
  ];
  return limitGameplayCardChoices(drawOnePerCategory(pool, ["经济战术", "防线战术", "控场战术"]), pool, choiceCount);
}

function waveBuildCardPools(wave = 1) {
  const buildScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.buildCostScale || 1;
  const upgradeScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.upgradeCostScale || 1;
  const rewardScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.cardRewardScale || 1;
  const buildPool = [
    { id: "build_arrow", name: "建造牌：箭楼", type: "build_tower", detail: "空位建造低价快攻塔", towerType: "arrow", cost: Math.round((7 + wave) * buildScale) },
    { id: "build_crossbow", name: "建造牌：重弩", type: "build_tower", detail: "空位建造高单体塔", towerType: "crossbow", cost: Math.round((10 + wave) * buildScale) },
    { id: "build_oil", name: "建造牌：火油", type: "build_tower", detail: "空位建造中距压制塔", towerType: "oil", cost: Math.round((9 + wave) * buildScale) }
  ];
  const improvePool = [
    { id: "build_upgrade", name: "升级牌：军械", type: "build_upgrade", detail: "点击已有塔升级，费用更低", cost: Math.round((8 + wave) * upgradeScale) },
    { id: "build_range", name: "强化牌：望楼", type: "build_buff", detail: "点击已有塔提高射程", buff: "range", cost: Math.round((6 + wave) * upgradeScale) },
    { id: "build_rapid", name: "强化牌：连弩", type: "build_buff", detail: "点击已有塔提高攻速", buff: "rapid", cost: Math.round((6 + wave) * upgradeScale) }
  ];
  const economyPool = [
    { id: "build_refund", name: "经济牌：回收", type: "build_gold", detail: `立刻获得 ${Math.round((10 + wave * 2) * rewardScale)} 金币`, value: Math.round((10 + wave * 2) * rewardScale), cost: 0 },
    { id: "build_discount", name: "经济牌：工匠", type: "build_discount", detail: `下一张建造/升级牌费用 -${Math.round(4 * rewardScale)}`, value: Math.round(4 * rewardScale), cost: 0 }
  ];
  return { buildPool, improvePool, economyPool };
}

function createWaveBuildDeck(wave = 1) {
  const fusionTuning = activeGameplayExperiment()?.runtimeConfig?.fusionTuning || createFusionTuningProfile(state.gameplayTuning, activeGameplayExperiment()?.runtimeConfig?.tuningScales || {});
  const { buildPool, improvePool, economyPool } = waveBuildCardPools(wave);
  const deck = [...buildPool, ...improvePool, ...economyPool, randomItem(buildPool), randomItem(improvePool)];
  if (fusionTuning.buildDeckBonus > 0) deck.push(...shuffleCards([...economyPool, ...improvePool]).slice(0, fusionTuning.buildDeckBonus));
  if (fusionTuning.buildDeckBonus < 0) deck.splice(Math.max(0, deck.findIndex((card) => card.type === "build_gold")), 1);
  return deck
    .map((card, index) => ({ ...card, instanceId: `${card.id}-${wave}-${index}-${Math.random().toString(36).slice(2, 5)}` }));
}

function createWaveBuildCards(wave = 1) {
  const choiceCount = activeGameplayExperiment()?.runtimeConfig?.fusionTuning?.cardChoiceCount || 3;
  const { buildPool, improvePool, economyPool } = waveBuildCardPools(wave);
  const cards = [randomItem(buildPool), randomItem(improvePool), randomItem(economyPool)];
  return limitGameplayCardChoices(cards, [...buildPool, ...improvePool, ...economyPool], Math.min(4, choiceCount));
}

function createWaveRiskContracts(wave) {
  const rewardScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.cardRewardScale || 1;
  const riskScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.riskPenaltyScale || 1;
  const choiceCount = activeGameplayExperiment()?.runtimeConfig?.fusionTuning?.eventChoiceCount || 3;
  const pool = [
    { id: "risk_tax", name: "贪婪契约：重赏", type: "wave_risk_gold", detail: `立刻获得 ${Math.round((24 + wave * 3) * rewardScale)} 金币；本波敌人增加`, value: Math.round((24 + wave * 3) * rewardScale), riskScale },
    { id: "risk_power", name: "火力契约：破釜", type: "wave_risk_damage", detail: "全塔火力提高；本波敌人速度提高", value: 1 + 0.22 * rewardScale, riskScale },
    { id: "risk_base", name: "守城契约：险守", type: "wave_risk_reward", detail: "本波奖励翻倍；本波漏怪伤害 +1", value: 2 },
    { id: "risk_elite", name: "精英契约：诱敌", type: "wave_risk_elite", detail: "本波击杀奖励提高；敌人生命提高", value: 1 + 0.16 * riskScale },
    { id: "risk_speed", name: "疾行契约：追击", type: "wave_risk_speed", detail: "立刻得分；本波敌人速度提高", value: Math.round((70 + wave * 10) * rewardScale), riskScale }
  ];
  return shuffleCards(pool).slice(0, choiceCount);
}

function limitGameplayCardChoices(cards, pool, count) {
  const result = [...cards];
  const available = shuffleCards(pool.filter((card) => !result.some((item) => item.id === card.id)));
  while (result.length < count && available.length) result.push(available.pop());
  return result.slice(0, count);
}

function drawOnePerCategory(pool, categories) {
  return categories.map((category) => randomItem(pool.filter((card) => card.name.startsWith(category)))).filter(Boolean);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function gameplayUsesCards() {
  return (
    state.gameplayTuning.secondaryLoop === "core_loop.deck_builder" ||
    state.gameplayTuning.secondaryLoop === "roguelite_growth" ||
    state.gameplayTuning.primaryLoop === "core_loop.deck_builder"
  );
}

function fusionEnemyHpMultiplier(experiment) {
  if (!experiment) return 1;
  if (!experiment.secondaryLoop) return 1;
  if (experiment.fusionMode === "dual") return 1.12;
  if (experiment.fusionMode === "primary") return 1.04;
  return 0.96;
}

function fusionAttackRateMultiplier(experiment) {
  if (!experiment) return 1;
  if (experiment.fusionMode === "dual") return 1.25;
  if (experiment.fusionMode === "primary") return 1.08;
  return 1;
}

function renderGameplayEditor() {
  syncGameplayModeControls();
  const skeleton = state.gameplaySkeleton;
  if (!skeleton) {
    gameplayRoute.innerHTML = `<div class="object-empty">等待生成</div>`;
    gameplaySummary.textContent = "在左侧 Chat 输入玩法想法后，这里会生成可试玩玩法实验。";
    gameplayFeedback.innerHTML = `<div class="object-empty">等待试玩数据</div>`;
    gameplayModules.innerHTML = "";
    gameplayEntities.innerHTML = "";
    gameplaySkeletonJson.textContent = "";
    syncGameplayApplyState();
    return;
  }
  syncGameplayControls();
  const missing = validateGameplaySkeleton(skeleton);
  const ruleSpec = gameplayRuleSpec(state.gameplayTuning.fusionTemplate);
  gameplayRuntimeStatus.textContent = missing.length ? `内部数据缺少 ${missing.join(", ")}` : state.gameplayRuntime.message;
  gameplaySummary.textContent = gameplayFusionTitle(skeleton);
  gameplayRoute.innerHTML = [
    routeChip("核心循环", `${primaryLoopLabel(state.gameplayTuning.primaryLoop)}负责主要操作和胜负压力。`),
    routeChip("融合玩法", secondaryLoopDescription(state.gameplayTuning.secondaryLoop)),
    routeChip("玩法关系", gameplayTemplateDescription(state.gameplayTuning.fusionTemplate)),
    ruleSpec ? routeChip("介入时机", ruleSpec.fusionTiming) : "",
    ruleSpec ? routeChip("成长/资源", `${ruleSpec.growthHook}；${ruleSpec.resourceHook}`) : "",
    ruleSpec ? routeChip("风险约束", ruleSpec.riskHook) : "",
    routeChip("参考案例", skeleton.reference_blueprints.map(blueprintLabel).join(" / ") || "无明确参考，按通用玩法骨架生成。")
  ].filter(Boolean).join("");
  gameplayFeedback.innerHTML = renderGameplayFeedback();
  gameplayModules.innerHTML = skeleton.modules
    .map((module) => `<div class="module-row"><strong>${escapeHtml(readableGameplayId(module.id))}</strong><span>${escapeHtml(JSON.stringify(module.config))}</span></div>`)
    .join("");
  gameplayEntities.innerHTML = skeleton.entities
    .map((entity) => `<div class="entity-row"><i style="--entity-color:${gameplayEntityColor(entity.type)}"></i><strong>${escapeHtml(entity.id)}</strong><span>${escapeHtml(entity.type)} · ${escapeHtml(entity.shape)}</span></div>`)
    .join("");
  gameplaySkeletonJson.textContent = JSON.stringify(skeleton, null, 2);
  syncGameplayApplyState();
}

function routeChip(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function syncGameplayControls() {
  const tuning = state.gameplayTuning;
  normalizeGameplayFusionTemplate();
  gameplayPrimaryLoop.value = tuning.primaryLoop;
  gameplaySecondaryLoop.value = tuning.secondaryLoop;
  renderGameplayFusionLab();
  const fusionTemplates = gameplayVisibleFusionTemplates();
  gameplayFusionTemplate.dataset.cardCount = String(fusionTemplates.length);
  gameplayFusionTemplate.innerHTML = fusionTemplates
    .map((template) => `
      <button
        data-tuning-field="fusionTemplate"
        data-tuning-value="${escapeAttribute(template.id)}"
        data-primary-loop="${escapeAttribute(template.primaryLoop || tuning.primaryLoop)}"
        data-secondary-loop="${escapeAttribute(template.secondaryLoop || "")}"
        data-fusion-lens="${escapeAttribute(template.sourceLensId || gameplayFusionLensIdForPair(template.primaryLoop || tuning.primaryLoop, template.secondaryLoop || ""))}"
      >
        <small>${escapeHtml(gameplayFusionTemplateMeta(template))}</small>
        <strong>${escapeHtml(template.label)}</strong>
        <span>${escapeHtml(template.description)}</span>
      </button>
    `)
    .join("");
  gameplayTuningRanges.forEach((input) => {
    input.value = tuning[input.dataset.tuningRange] ?? 100;
    const output = document.querySelector(`[data-tuning-output="${input.dataset.tuningRange}"]`);
    if (output) output.textContent = gameplayTuningDisplayValue(input.dataset.tuningRange, tuning[input.dataset.tuningRange] ?? 100);
  });
  document.querySelectorAll("[data-tuning-visibility]").forEach((item) => {
    item.hidden = !shouldShowGameplayTuningControl(item.dataset.tuningVisibility);
  });
  if (gameplayTuningImpact) gameplayTuningImpact.innerHTML = renderGameplayTuningImpact();
  document.querySelectorAll("[data-tuning-field]").forEach((button) => {
    const buttonPrimaryLoop = button.dataset.primaryLoop || tuning.primaryLoop;
    const buttonSecondaryLoop = button.dataset.secondaryLoop || "";
    button.classList.toggle("active",
      tuning.primaryLoop === buttonPrimaryLoop &&
      tuning.secondaryLoop === buttonSecondaryLoop &&
      tuning[button.dataset.tuningField] === button.dataset.tuningValue
    );
  });
}

function syncGameplayModeControls() {
  const isProMode = state.gameplayMode === "pro";
  gameplayTools.classList.toggle("is-pro-mode", isProMode);
  gameplayTools.classList.toggle("is-fast-mode", !isProMode);
  gameplayModeButtons.forEach((button) => {
    const active = button.dataset.gameplayMode === state.gameplayMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function canApplyGameplayChanges() {
  return Boolean(state.gameplaySkeleton && state.gameplayRuntime.supported && state.gameplayDirty);
}

function syncGameplayApplyState() {
  const canApply = canApplyGameplayChanges();
  gameplayApply.disabled = !canApply;
  gameplayApply.setAttribute("aria-disabled", String(!canApply));
  gameplayApply.title = canApply ? "应用当前玩法参数" : "修改玩法参数后可应用";
}

function renderGameplayTuningImpact() {
  const experiment = activeGameplayExperiment();
  const fusionTuning = experiment?.runtimeConfig?.fusionTuning || createFusionTuningProfile(state.gameplayTuning, experiment?.runtimeConfig?.tuningScales || {});
  const template = state.gameplayTuning.fusionTemplate;
  const lines = [
    `压力强度：敌人血量、速度和刷新间隔 ${gameplayTuningDisplayValue("pressureIntensity", state.gameplayTuning.pressureIntensity)}`,
    `经济宽松度：初始资源和击杀收益 ${gameplayTuningDisplayValue("resourceGenerosity", state.gameplayTuning.resourceGenerosity)}`
  ];
  if (state.gameplayTuning.primaryLoop === "core_loop.wave_defense" || state.gameplayTuning.secondaryLoop === "core_loop.wave_defense") {
    lines.push(`建造成本：建塔和升级费用 ${gameplayTuningDisplayValue("constructionCost", state.gameplayTuning.constructionCost)}`);
  }
  if (shouldShowGameplayTuningControl("reward")) {
    if (template === "cards_as_active_skills" || template === "cards_as_growth_choices") {
      lines.push(`卡牌收益：起手 ${fusionTuning.startingHand}、手牌上限 ${fusionTuning.maxHand}、抽牌间隔 x${fusionTuning.drawIntervalMultiplier.toFixed(2)}、卡牌强度 x${fusionTuning.cardPower.toFixed(2)}`);
    } else if (template === "build_cards") {
      lines.push(`卡牌收益：手牌 ${fusionTuning.buildHandSize}、候选 ${fusionTuning.cardChoiceCount}、牌库补强 ${fusionTuning.buildDeckBonus >= 0 ? `+${fusionTuning.buildDeckBonus}` : fusionTuning.buildDeckBonus}`);
    } else if (template === "wave_tactic_cards" || template === "risk_contract" || template === "risk_event_cards") {
      lines.push(`卡牌收益：候选 ${template === "wave_tactic_cards" ? fusionTuning.waveChoiceCount : fusionTuning.eventChoiceCount}、收益倍率 x${fusionTuning.riskReward.toFixed(2)}`);
    } else if (state.gameplayTuning.primaryLoop === "core_loop.deck_builder") {
      lines.push(`卡牌收益：奖励候选 ${fusionTuning.cardChoiceCount}、卡牌强度 x${fusionTuning.cardPower.toFixed(2)}、起手 ${Math.max(4, fusionTuning.maxHand)}`);
    }
  }
  if (shouldShowGameplayTuningControl("risk")) {
    lines.push(`风险惩罚：敌方强化倍率 x${fusionTuning.riskPenalty.toFixed(2)}`);
  }
  if (shouldShowGameplayTuningControl("hero")) {
    lines.push(`英雄强度：英雄/幸存者生命、伤害和活动价值 ${gameplayTuningDisplayValue("heroPower", state.gameplayTuning.heroPower)}`);
  }
  return lines.map((line) => `<div><span>${escapeHtml(line.split("：")[0])}</span>：${escapeHtml(line.split("：").slice(1).join("："))}</div>`).join("");
}

function shouldShowGameplayTuningControl(type) {
  const tuning = state.gameplayTuning;
  const template = normalizeGameplayFusionTemplateValue(tuning.primaryLoop, tuning.secondaryLoop, tuning.fusionTemplate);
  if (type === "construction") return tuning.primaryLoop === "core_loop.wave_defense" || tuning.secondaryLoop === "core_loop.wave_defense";
  if (type === "risk") return template === "risk_contract" || template === "risk_event_cards" || template === "route_event_cards";
  if (type === "reward") {
    return tuning.secondaryLoop === "core_loop.deck_builder" ||
      tuning.secondaryLoop === "roguelite_growth" ||
      tuning.primaryLoop === "core_loop.deck_builder" ||
      template === "wave_tactic_cards" ||
      template === "build_cards" ||
      template === "cards_as_active_skills" ||
      template === "cards_as_growth_choices";
  }
  if (type === "hero") {
    return tuning.primaryLoop === "core_loop.survival_growth" ||
      tuning.secondaryLoop === "core_loop.survival_growth";
  }
  return true;
}

function gameplayTuningDisplayValue(key, value) {
  const number = Math.round(Number(value) || 0);
  if (key === "constructionCost") {
    if (value < 85) return `低 | ${number}`;
    if (value > 115) return `高 | ${number}`;
    return `标准 | ${number}`;
  }
  if (key === "resourceGenerosity") {
    if (value < 85) return `紧 | ${number}`;
    if (value > 115) return `宽 | ${number}`;
    return `标准 | ${number}`;
  }
  if (key === "pressureIntensity" || key === "riskPenaltyScale") {
    if (value < 85) return `低 | ${number}`;
    if (value > 115) return `高 | ${number}`;
    return `标准 | ${number}`;
  }
  if (key === "cardRewardScale") {
    if (value < 85) return `少 | ${number}`;
    if (value > 115) return `多 | ${number}`;
    return `标准 | ${number}`;
  }
  if (key === "heroPower") {
    if (value <= 0) return `关闭 | ${number}`;
    if (value < 85) return `弱 | ${number}`;
    if (value > 115) return `强 | ${number}`;
    return `标准 | ${number}`;
  }
  return String(number);
}

function gameplayPressureConfig(value) {
  return {
    low: { label: "低", spawnInterval: 1.45, hpMultiplier: 0.85, speedMultiplier: 0.88 },
    medium: { label: "中", spawnInterval: 1.15, hpMultiplier: 1, speedMultiplier: 1 },
    high: { label: "高", spawnInterval: 0.78, hpMultiplier: 1.25, speedMultiplier: 1.16 }
  }[value] || { label: "中", spawnInterval: 1.15, hpMultiplier: 1, speedMultiplier: 1 };
}

function gameplayResourceConfig(value) {
  return {
    tight: { initialGold: 18, killReward: 1, buildCost: 12, initialTowers: 1 },
    standard: { initialGold: 30, killReward: 2, buildCost: 10, initialTowers: 2 },
    loose: { initialGold: 48, killReward: 3, buildCost: 8, initialTowers: 3 }
  }[value] || { initialGold: 30, killReward: 2, buildCost: 10, initialTowers: 2 };
}

function gameplayGrowthConfig(value) {
  return {
    slow: { label: "慢", expPerKill: 0.5 },
    medium: { label: "中", expPerKill: 1 },
    fast: { label: "快", expPerKill: 1.5 }
  }[value] || { label: "中", expPerKill: 1 };
}

function gameplayHeroConfig(value) {
  return {
    off: { enabled: false, damageMultiplier: 0 },
    assist: { enabled: true, damageMultiplier: 1 },
    core: { enabled: true, damageMultiplier: 1.7 }
  }[value] || { enabled: true, damageMultiplier: 1 };
}

function gameplayFusionTitle(skeleton) {
  const theme = skeleton?.theme?.setting === "three_kingdoms" ? "三国" : "灰盒";
  const primary = primaryLoopLabel(state.gameplayTuning.primaryLoop || skeleton?.primary_loop);
  const secondary = secondaryLoopLabel(state.gameplayTuning.secondaryLoop || skeleton?.secondary_loops?.[0]);
  return secondary === "无融合" ? `${theme}${primary}玩法实验` : `${theme}${primary} × ${secondary}玩法实验`;
}

function gameplayExperimentCopy() {
  return "当前按右侧参数直接试玩，观察玩法关系是否能形成可理解的循环。";
}

function renderGameplayFeedback() {
  const runtime = state.gameplayRuntime;
  const fusion = `${primaryLoopLabel(state.gameplayTuning.primaryLoop)} + ${secondaryLoopLabel(state.gameplayTuning.secondaryLoop)}`;
  return `
    <div class="feedback-stat-grid">
      <span>基地血量 <strong>${Math.round(runtime.baseHp)}</strong></span>
      <span>金币 <strong>${Math.floor(runtime.gold)}</strong></span>
      <span>波次 <strong>${runtime.wave}</strong></span>
      <span>当前融合 <strong>${escapeHtml(fusion)}</strong></span>
    </div>
    <p>${escapeHtml(feedbackSuggestion())}</p>
  `;
}

function feedbackSuggestion() {
  const tuning = state.gameplayTuning;
  if (tuning.pressureIntensity < 80 && tuning.resourceGenerosity > 130) return "当前更适合验证基础循环，不适合判断难度。可以在循环确认后提高压力强度。";
  if (tuning.pressureIntensity > 140 && tuning.resourceGenerosity < 80) return "当前偏高压，适合验证防线是否紧张，但如果过早失败可以提高经济宽松度。";
  return activeGameplayFusionTemplate()?.description || "当前先验证主玩法和副玩法是否形成清楚的因果关系。";
}

function primaryLoopLabel(id) {
  return {
    "core_loop.wave_defense": "塔防",
    "core_loop.survival_growth": "幸存者",
    "core_loop.deck_builder": "Roguelite 卡牌",
    "core_loop.auto_battler": "自走棋",
    "core_loop.tactical_turn": "战棋"
  }[id] || "塔防";
}

function secondaryLoopLabel(id) {
  return {
    "": "无融合",
    "core_loop.wave_defense": "塔防",
    "core_loop.deck_builder": "Roguelite 卡牌",
    "core_loop.survival_growth": "幸存者",
    roguelite_growth: "Roguelite 随机成长"
  }[id || ""] || "无融合";
}

function secondaryLoopDescription(id) {
  return {
    "": "不引入副玩法，先验证主循环是否能跑通。",
    "core_loop.wave_defense": "路线、防线、建造和基地压力进入主玩法。",
    "core_loop.deck_builder": "抽牌、选牌、费用和牌组成长进入主玩法关键决策。",
    "core_loop.survival_growth": "自由移动、自动攻击、包围压力和经验成长进入主玩法。",
    roguelite_growth: "加入随机三选一成长，验证每轮 build 是否有变化。"
  }[id || ""] || "不引入副玩法，先验证主循环是否能跑通。";
}

const gameplayRuleCardSpecs = {
  free_hero_rescue: {
    id: "free_hero_rescue",
    pair: "core_loop.wave_defense+core_loop.survival_growth",
    label: "自由英雄救火",
    description: "英雄脱离路线限制，全场处理侧翼袭扰和漏网敌人，塔防负责主路线胜负压力。",
    mode: "primary",
    primaryAction: "建塔守主路",
    fusionTiming: "战斗中实时救火",
    resourceHook: "击杀给金币",
    growthHook: "无独立升级，强调走位救场",
    riskHook: "侧翼兵越过英雄会直冲基地"
  },
  surround_zone_defense: {
    id: "surround_zone_defense",
    pair: "core_loop.wave_defense+core_loop.survival_growth",
    label: "包围区防守",
    description: "主路线敌人压基地，同时场外敌群围猎英雄，玩家要同时保护基地和英雄。",
    mode: "dual",
    primaryAction: "建塔守主路",
    fusionTiming: "场外追猎持续发生",
    resourceHook: "击杀给金币",
    growthHook: "无成长奖励，强调双失败条件",
    riskHook: "英雄倒下即失败"
  },
  hero_growth_defense: {
    id: "hero_growth_defense",
    pair: "core_loop.wave_defense+core_loop.survival_growth",
    label: "经验反哺防线",
    description: "英雄击杀获得经验，升级时选择强化塔、基地或英雄，把幸存者成长反哺塔防防线。",
    mode: "dual",
    primaryAction: "建塔守主路",
    fusionTiming: "英雄击杀后触发成长",
    resourceHook: "击杀给金币和经验",
    growthHook: "每波最多一次防线成长",
    riskHook: "英雄需要参与击杀才有成长"
  },
  wave_tactic_cards: {
    id: "wave_tactic_cards",
    pair: "core_loop.wave_defense+core_loop.deck_builder",
    label: "波前战术牌",
    description: "每波前从经济、防线、控场三类各抽一张，选择一张改变本波打法。",
    mode: "dual",
    primaryAction: "建塔守主路",
    fusionTiming: "每波开始前选牌",
    resourceHook: "战术牌可改金币、奖励或塔强度",
    growthHook: "本波临时策略，不构筑牌组",
    riskHook: "错选会让本波防线薄弱"
  },
  build_cards: {
    id: "build_cards",
    pair: "core_loop.wave_defense+core_loop.deck_builder",
    label: "牌组防线",
    description: "建塔、升级和经济都来自手牌，牌会进入弃牌堆再洗回，防线随牌组循环变化。",
    mode: "primary",
    primaryAction: "用手牌建塔/升级",
    fusionTiming: "战斗中持续抽牌操作",
    resourceHook: "手牌费用消耗金币",
    growthHook: "牌组循环决定建造与升级机会",
    riskHook: "手牌不顺会造成防线空窗"
  },
  risk_contract: {
    id: "risk_contract",
    pair: "core_loop.wave_defense+core_loop.deck_builder",
    label: "风险契约牌",
    description: "波前选择高收益契约，同时给下一波敌人叠加强化，收益和压力成对出现。",
    mode: "light",
    primaryAction: "建塔守主路",
    fusionTiming: "每波开始前承接契约",
    resourceHook: "契约给金币、奖励或火力",
    growthHook: "无牌组成长，强调风险层数",
    riskHook: "敌人数量、速度、血量或漏怪伤害提高"
  },
  cards_as_active_skills: {
    id: "cards_as_active_skills",
    pair: "core_loop.survival_growth+core_loop.deck_builder",
    label: "实时抽牌技能流",
    description: "击杀补能量，战斗中从牌库抽技能牌，打出后进弃牌堆再洗回。",
    mode: "dual",
    primaryAction: "走位和自动攻击",
    fusionTiming: "战斗中实时抽牌/出牌",
    resourceHook: "击杀补能量",
    growthHook: "保留幸存者升级，卡牌作为主动技能",
    riskHook: "能量不足或手牌满会产生操作空窗"
  },
  cards_as_growth_choices: {
    id: "cards_as_growth_choices",
    pair: "core_loop.survival_growth+core_loop.deck_builder",
    label: "升级构筑牌组",
    description: "保留幸存者升级，同时每次升级选择英雄成长和牌组构筑目标。",
    mode: "primary",
    primaryAction: "走位和自动攻击",
    fusionTiming: "升级时进行牌组运营",
    resourceHook: "击杀补能量，升级改牌组",
    growthHook: "每次升级同时选英雄成长与加牌/升牌/删牌",
    riskHook: "牌组臃肿会降低关键牌出现率"
  },
  risk_event_cards: {
    id: "risk_event_cards",
    pair: "core_loop.survival_growth+core_loop.deck_builder",
    label: "风险事件牌",
    description: "战斗中主动拿高收益事件，同时叠加敌潮速度、血量、数量或追击压力。",
    mode: "light",
    primaryAction: "走位和自动攻击",
    fusionTiming: "战斗中随时承接事件",
    resourceHook: "事件给经验、分数或击杀收益",
    growthHook: "收益可加速升级",
    riskHook: "风险层数会持续推高刷怪压力"
  },
  portable_turret_ring: {
    id: "portable_turret_ring",
    pair: "core_loop.survival_growth+core_loop.wave_defense",
    label: "移动炮台护圈",
    description: "幸存者保持自由走位，击杀获得零件，在身边部署临时炮台形成安全圈。",
    mode: "dual",
    primaryAction: "走位和自动攻击",
    fusionTiming: "击杀积累零件后点击场地部署",
    resourceHook: "击杀给经验和零件",
    growthHook: "升级强化角色，零件强化临时防线",
    riskHook: "炮台位置错误会被包围突破"
  },
  survival_base_zone: {
    id: "survival_base_zone",
    pair: "core_loop.survival_growth+core_loop.wave_defense",
    label: "据点防守圈",
    description: "玩家自由走位拉怪，但必须围绕据点生存，离开据点会失去固定火力支援。",
    mode: "dual",
    primaryAction: "走位、拉怪和保护据点",
    fusionTiming: "敌潮持续围攻玩家和据点",
    resourceHook: "击杀给经验和修筑零件",
    growthHook: "升级强化玩家，零件升级/修复据点",
    riskHook: "据点被破坏或角色死亡都会失败"
  },
  tower_skill_loadout: {
    id: "tower_skill_loadout",
    pair: "core_loop.survival_growth+core_loop.wave_defense",
    label: "防线召唤技能",
    description: "塔防元素变成主动技能牌，玩家在幸存者战斗中召唤箭雨、路障或临时塔阵。",
    mode: "primary",
    primaryAction: "走位和释放防线技能",
    fusionTiming: "击杀充能后点击技能",
    resourceHook: "击杀补充防线充能",
    growthHook: "升级强化角色，技能池提供战术爆发",
    riskHook: "技能空窗期会被敌群压缩走位"
  },
  card_build_lane: {
    id: "card_build_lane",
    pair: "core_loop.deck_builder+core_loop.wave_defense",
    label: "牌局建防线",
    description: "卡牌战斗是主体，塔防作为可建造防线，建塔牌和升级牌会影响每回合自动火力。",
    mode: "dual",
    primaryAction: "抽牌、出牌和运营防线",
    fusionTiming: "牌局回合内出防线牌",
    resourceHook: "费用消耗能量，通关获得新牌",
    growthHook: "防线牌进入牌组循环，塔会持续输出",
    riskHook: "防线不足时敌方会直接压基地"
  },
  defense_relics: {
    id: "defense_relics",
    pair: "core_loop.deck_builder+core_loop.wave_defense",
    label: "防线遗物",
    description: "每场牌局胜利后选择防线遗物，遗物为后续战斗提供持续塔防规则。",
    mode: "primary",
    primaryAction: "牌局战斗和遗物选择",
    fusionTiming: "每场胜利后选择防线遗物",
    resourceHook: "奖励选择沉淀为被动防线",
    growthHook: "遗物长期改变火力、护盾或建造效率",
    riskHook: "遗物选择会锁定后续防守侧重点"
  },
  route_event_cards: {
    id: "route_event_cards",
    pair: "core_loop.deck_builder+core_loop.wave_defense",
    label: "路线事件牌",
    description: "每场牌局前选择路线事件，主动改变本场敌人、奖励和基地压力。",
    mode: "light",
    primaryAction: "牌局战斗和路线抉择",
    fusionTiming: "每场战斗开始前选择路线事件",
    resourceHook: "事件给金币、牌或短期火力",
    growthHook: "事件不长期构筑，强调单场路线判断",
    riskHook: "高收益事件会提高敌方伤害或基地压力"
  },
  auto_battle_deck: {
    id: "auto_battle_deck",
    pair: "core_loop.deck_builder+core_loop.survival_growth",
    label: "自动战斗牌组",
    description: "卡牌用于指挥自动战斗单位，召唤和强化幸存者伙伴来持续输出。",
    mode: "dual",
    primaryAction: "出牌、召唤和强化单位",
    fusionTiming: "牌局回合内召唤幸存者伙伴",
    resourceHook: "能量支付召唤和指挥费用",
    growthHook: "伙伴在数回合内持续战斗",
    riskHook: "单位不足时敌人会直接攻击玩家"
  },
  survival_turn_cards: {
    id: "survival_turn_cards",
    pair: "core_loop.deck_builder+core_loop.survival_growth",
    label: "生存回合牌局",
    description: "幸存者压力被压缩成回合制牌局，玩家用闪避、清场和走位牌处理包围。",
    mode: "primary",
    primaryAction: "回合内打生存牌",
    fusionTiming: "每回合处理敌群意图",
    resourceHook: "能量决定本回合行动数",
    growthHook: "奖励牌补充清场、闪避或续航能力",
    riskHook: "敌群压力逐回合增长"
  },
  summon_deck_flow: {
    id: "summon_deck_flow",
    pair: "core_loop.deck_builder+core_loop.survival_growth",
    label: "牌组召唤流",
    description: "牌组围绕召唤物构筑，召唤物自动攻击并吸收伤害，形成卡牌版幸存者战线。",
    mode: "dual",
    primaryAction: "抽牌、召唤和维护召唤物",
    fusionTiming: "出牌后召唤物持续参与战斗",
    resourceHook: "能量支付召唤，奖励补强召唤牌",
    growthHook: "召唤物可升级、复制或延长持续时间",
    riskHook: "牌组断召会失去前排保护"
  }
};

const gameplayRuleCardOrder = {
  "core_loop.wave_defense+core_loop.survival_growth": ["free_hero_rescue", "surround_zone_defense", "hero_growth_defense"],
  "core_loop.wave_defense+core_loop.deck_builder": ["wave_tactic_cards", "build_cards", "risk_contract"],
  "core_loop.survival_growth+core_loop.wave_defense": ["portable_turret_ring", "survival_base_zone", "tower_skill_loadout"],
  "core_loop.survival_growth+core_loop.deck_builder": ["cards_as_active_skills", "cards_as_growth_choices", "risk_event_cards"],
  "core_loop.deck_builder+core_loop.wave_defense": ["card_build_lane", "defense_relics", "route_event_cards"],
  "core_loop.deck_builder+core_loop.survival_growth": ["auto_battle_deck", "survival_turn_cards", "summon_deck_flow"]
};

const gameplayFusionLensPresets = [
  {
    id: "random",
    label: "随机",
    icon: "shuffle",
    title: "随机推荐",
    summary: "AI 基于当前塔防底盘生成一组可试玩融合方案。",
    primaryLoop: "core_loop.wave_defense",
    secondaryLoop: "core_loop.deck_builder",
    fusionTemplate: "wave_tactic_cards",
    isMeta: true,
    position: { x: 50, y: 18, scale: 0.94, delay: -1.1 },
    globe: { lat: 18, lon: -42 },
    focusRotation: { x: -0.12, y: 0.72 },
    color: "#0f172a",
    tone: "slate"
  },
  {
    id: "roguelite",
    label: "肉鸽",
    icon: "casino",
    title: "肉鸽方向",
    summary: "把波前选择、抽牌和牌组变化放进塔防节奏，适合提升每波开始前的决策密度。",
    primaryLoop: "core_loop.wave_defense",
    secondaryLoop: "core_loop.deck_builder",
    fusionTemplate: "wave_tactic_cards",
    position: { x: 22, y: 28, scale: 0.94, delay: -1.1 },
    globe: { lat: 18, lon: -42 },
    focusRotation: { x: -0.12, y: 0.72 },
    color: "#0891b2",
    tone: "cyan"
  },
  {
    id: "strategy",
    label: "战棋",
    icon: "grid_view",
    disabled: true,
    title: "战棋方向",
    summary: "把布阵、回合规划和格子决策转译进塔防，适合强化开战前的路线和防线判断。",
    primaryLoop: "core_loop.wave_defense",
    secondaryLoop: "core_loop.deck_builder",
    fusionTemplate: "build_cards",
    position: { x: 77, y: 26, scale: 0.98, delay: -2.3 },
    globe: { lat: 24, lon: 48 },
    focusRotation: { x: -0.18, y: -0.82 },
    color: "#0f766e",
    tone: "green"
  },
  {
    id: "survival",
    label: "幸存者",
    icon: "directions_run",
    title: "幸存者方向",
    summary: "把自由走位、围猎和双失败条件加入塔防，适合做更紧张的双线操作。",
    primaryLoop: "core_loop.wave_defense",
    secondaryLoop: "core_loop.survival_growth",
    fusionTemplate: "surround_zone_defense",
    position: { x: 24, y: 72, scale: 0.9, delay: -3.4 },
    globe: { lat: -26, lon: -58 },
    focusRotation: { x: 0.42, y: 0.98 },
    color: "#7c3aed",
    tone: "violet"
  },
  {
    id: "moba",
    label: "MOBA",
    icon: "sports_esports",
    disabled: true,
    title: "MOBA 方向",
    summary: "把英雄救场、技能释放和战场支援转译成塔防中的主动操作层。",
    primaryLoop: "core_loop.wave_defense",
    secondaryLoop: "core_loop.survival_growth",
    fusionTemplate: "free_hero_rescue",
    position: { x: 78, y: 70, scale: 0.92, delay: -0.4 },
    globe: { lat: -16, lon: 58 },
    focusRotation: { x: 0.26, y: -1.04 },
    color: "#2563eb",
    tone: "blue"
  },
  {
    id: "merge",
    label: "合成",
    icon: "merge",
    disabled: true,
    title: "合成方向",
    summary: "把升级、合成和循环构筑放入防线成长，让塔和牌组一起形成长期 build。",
    primaryLoop: "core_loop.wave_defense",
    secondaryLoop: "core_loop.deck_builder",
    fusionTemplate: "build_cards",
    position: { x: 45, y: 18, scale: 0.9, delay: -1.9 },
    globe: { lat: 42, lon: 5 },
    focusRotation: { x: -0.72, y: -0.08 },
    color: "#db2777",
    tone: "pink"
  },
  {
    id: "management",
    label: "经营",
    icon: "account_balance",
    disabled: true,
    title: "经营方向",
    summary: "把收益、投资和长期资源曲线转译成波次前后的经济选择。",
    primaryLoop: "core_loop.wave_defense",
    secondaryLoop: "core_loop.deck_builder",
    fusionTemplate: "wave_tactic_cards",
    position: { x: 64, y: 84, scale: 0.88, delay: -2.6 },
    globe: { lat: -44, lon: 28 },
    focusRotation: { x: 0.78, y: -0.48 },
    color: "#64748b",
    tone: "slate"
  },
  {
    id: "card",
    label: "卡牌",
    icon: "style",
    title: "卡牌方向",
    summary: "把抽牌、费用、出牌和奖励构筑作为主体验，塔防成为牌局中的防线资源。",
    primaryLoop: "core_loop.deck_builder",
    secondaryLoop: "core_loop.wave_defense",
    fusionTemplate: "card_build_lane",
    position: { x: 18, y: 48, scale: 0.88, delay: -0.8 },
    globe: { lat: 0, lon: -92 },
    focusRotation: { x: -0.02, y: 1.58 },
    color: "#b45309",
    tone: "amber"
  },
  {
    id: "autochess",
    label: "自走棋",
    icon: "groups",
    disabled: true,
    title: "自走棋方向",
    summary: "把阵容、站位和自动战斗的策略感转译成波次前的防线调度。",
    primaryLoop: "core_loop.wave_defense",
    secondaryLoop: "core_loop.deck_builder",
    fusionTemplate: "build_cards",
    position: { x: 32, y: 84, scale: 0.86, delay: -1.4 },
    globe: { lat: -34, lon: -38 },
    focusRotation: { x: 0.58, y: 0.68 },
    color: "#4f46e5",
    tone: "indigo"
  },
  {
    id: "runner",
    label: "跑酷",
    icon: "directions_run",
    disabled: true,
    title: "跑酷方向",
    summary: "还没有接入可试玩融合模板，先作为探索方向展示。",
    color: "#0ea5e9",
    tone: "blue"
  },
  {
    id: "puzzle",
    label: "三消",
    icon: "extension",
    disabled: true,
    title: "三消方向",
    summary: "还没有接入可试玩融合模板，先作为探索方向展示。",
    color: "#9333ea",
    tone: "violet"
  },
  {
    id: "idle",
    label: "放置",
    icon: "timer",
    disabled: true,
    title: "放置方向",
    summary: "还没有接入可试玩融合模板，先作为探索方向展示。",
    color: "#64748b",
    tone: "slate"
  },
  {
    id: "builder",
    label: "建造",
    icon: "construction",
    disabled: true,
    title: "建造方向",
    summary: "还没有接入可试玩融合模板，先作为探索方向展示。",
    color: "#ca8a04",
    tone: "amber"
  },
  {
    id: "custom",
    label: "自定义",
    icon: "edit",
    title: "自定义类型",
    summary: "输入一句想要的融合感觉，AI 会转译为当前可试玩的候选组合。",
    position: { x: 50, y: 86, scale: 0.86, delay: -1.8 },
    globe: { lat: -48, lon: 8 },
    focusRotation: { x: 0.82, y: -0.15 },
    color: "#475569",
    tone: "slate"
  }
];

const gameplayFusionLensCycle = ["roguelite", "survival", "card"];

const gameplayFusionGlobeLatitudes = [18, -12, 24, -20, 10, -26, 30, -8, 16, -28];

function gameplayVisibleFusionLensPresets() {
  return gameplayFusionLensPresets.filter((lens) => !lens.hidden);
}

function gameplayClickableFusionLensPresets() {
  return gameplayVisibleFusionLensPresets().filter((lens) => !lens.disabled);
}

gameplayVisibleFusionLensPresets().forEach((lens, index, presets) => {
  const step = 360 / presets.length;
  const lon = -180 + step * index + step / 2;
  const lat = gameplayFusionGlobeLatitudes[index % gameplayFusionGlobeLatitudes.length];
  lens.globe = { lat, lon };
  lens.focusRotation = {
    x: Math.max(-0.72, Math.min(0.72, -lat * Math.PI / 180 * 0.82)),
    y: -lon * Math.PI / 180
  };
});

function gameplayRuleSpec(templateId) {
  return gameplayRuleCardSpecs[templateId] || null;
}

function gameplayTemplateFromRuleSpec(id) {
  const spec = gameplayRuleSpec(id);
  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    mode: spec.mode
  };
}

function gameplayFusionTemplates(primaryLoop, secondaryLoop) {
  const key = `${primaryLoop}+${secondaryLoop || ""}`;
  const orderedSpecs = gameplayRuleCardOrder[key];
  if (orderedSpecs) return orderedSpecs.map(gameplayTemplateFromRuleSpec);
  const templates = {
    "core_loop.deck_builder+": [
      { id: "pure_card_encounters", label: "牌局战斗", description: "先验证抽牌、能量、敌人意图和奖励选牌是否成立。", mode: "primary" }
    ],
    "core_loop.survival_growth+": [
      { id: "pure_survival_growth", label: "幸存者成长", description: "先验证走位、刷怪、经验和升级选择是否成立。", mode: "primary" }
    ],
    "core_loop.wave_defense+": [
      { id: "pure_wave_defense", label: "波次防守", description: "先验证路线、建塔、升级、波次和基地压力是否成立。", mode: "primary" }
    ]
  };
  return templates[key] || [
    { id: "unsupported_relation", label: "暂无合理模板", description: "当前组合还没有可试玩的玩法关系模板。", mode: "light" }
  ];
}

function gameplayFusionPairKey(primaryLoop, secondaryLoop) {
  return `${primaryLoop}+${secondaryLoop || ""}`;
}

function gameplayFusionLensIdForPair(primaryLoop, secondaryLoop) {
  const key = gameplayFusionPairKey(primaryLoop, secondaryLoop);
  return {
    "core_loop.wave_defense+core_loop.deck_builder": "roguelite",
    "core_loop.wave_defense+core_loop.survival_growth": "survival",
    "core_loop.deck_builder+core_loop.wave_defense": "card",
    "core_loop.deck_builder+core_loop.survival_growth": "card",
    "core_loop.survival_growth+core_loop.wave_defense": "survival",
    "core_loop.survival_growth+core_loop.deck_builder": "roguelite"
  }[key] || "random";
}

function decorateGameplayFusionTemplates(templates, primaryLoop, secondaryLoop, lensId, options = {}) {
  return templates.map((template) => ({
    ...template,
    primaryLoop,
    secondaryLoop: secondaryLoop || "",
    sourceLensId: lensId || gameplayFusionLensIdForPair(primaryLoop, secondaryLoop),
    isRecommendation: Boolean(options.isRecommendation),
    recommendationDirection: options.recommendationDirection || null
  }));
}

function gameplayFusionTemplateForPair(primaryLoop, secondaryLoop, templateId, lensId, options = {}) {
  const templates = gameplayFusionTemplates(primaryLoop, secondaryLoop);
  const template = templates.find((item) => item.id === templateId) || templates[0];
  if (!template || template.id === "unsupported_relation") return null;
  return decorateGameplayFusionTemplates([template], primaryLoop, secondaryLoop, lensId, options)[0];
}

function gameplayRecommendedFusionTemplates() {
  const primaryLoop = state.gameplayTuning.primaryLoop || "core_loop.wave_defense";
  const recommendations = gameplayRecommendedFusionTargets(primaryLoop);
  const usedDirection = new Set();
  return recommendations
    .map((item) => gameplayFusionTemplateForPair(item.primaryLoop, item.secondaryLoop, item.fusionTemplate, item.lensId, {
      isRecommendation: true,
      recommendationDirection: item.recommendationDirection
    }))
    .filter(Boolean)
    .filter((template) => {
      const direction = template.recommendationDirection || template.sourceLensId;
      if (usedDirection.has(direction)) return false;
      usedDirection.add(direction);
      return true;
    })
    .slice(0, 3);
}

function gameplayRecommendedFusionTargets(primaryLoop) {
  const towerDefenseMix = [
    { primaryLoop: "core_loop.wave_defense", secondaryLoop: "core_loop.deck_builder", fusionTemplate: "wave_tactic_cards", lensId: "roguelite", recommendationDirection: "roguelite" },
    { primaryLoop: "core_loop.wave_defense", secondaryLoop: "core_loop.survival_growth", fusionTemplate: "free_hero_rescue", lensId: "survival", recommendationDirection: "survival" },
    { primaryLoop: "core_loop.deck_builder", secondaryLoop: "core_loop.wave_defense", fusionTemplate: "route_event_cards", lensId: "random", recommendationDirection: "random" }
  ];
  return {
    "core_loop.wave_defense": towerDefenseMix,
    "core_loop.survival_growth": [
      { primaryLoop: "core_loop.survival_growth", secondaryLoop: "core_loop.wave_defense", fusionTemplate: "portable_turret_ring", lensId: "survival", recommendationDirection: "tower" },
      { primaryLoop: "core_loop.survival_growth", secondaryLoop: "core_loop.deck_builder", fusionTemplate: "cards_as_active_skills", lensId: "roguelite", recommendationDirection: "roguelite" },
      { primaryLoop: "core_loop.deck_builder", secondaryLoop: "core_loop.survival_growth", fusionTemplate: "survival_turn_cards", lensId: "random", recommendationDirection: "random" }
    ],
    "core_loop.deck_builder": [
      { primaryLoop: "core_loop.deck_builder", secondaryLoop: "core_loop.wave_defense", fusionTemplate: "card_build_lane", lensId: "card", recommendationDirection: "tower" },
      { primaryLoop: "core_loop.deck_builder", secondaryLoop: "core_loop.survival_growth", fusionTemplate: "auto_battle_deck", lensId: "survival", recommendationDirection: "survival" },
      { primaryLoop: "core_loop.wave_defense", secondaryLoop: "core_loop.deck_builder", fusionTemplate: "risk_contract", lensId: "random", recommendationDirection: "random" }
    ]
  }[primaryLoop] || towerDefenseMix;
}

function gameplayVisibleFusionTemplates(activeId = currentGameplayFusionLensId()) {
  if (activeId === "random") return gameplayRecommendedFusionTemplates();
  if (activeId === "custom" && state.gameplayCustomFusionTarget) {
    const target = state.gameplayCustomFusionTarget;
    return decorateGameplayFusionTemplates(
      gameplayFusionTemplates(target.primaryLoop, target.secondaryLoop),
      target.primaryLoop,
      target.secondaryLoop,
      "custom"
    );
  }
  const lens = gameplayFusionLensPresets.find((item) => item.id === activeId);
  if (lens?.primaryLoop && lens.secondaryLoop !== undefined && !lens.isMeta) {
    return decorateGameplayFusionTemplates(
      gameplayFusionTemplates(lens.primaryLoop, lens.secondaryLoop),
      lens.primaryLoop,
      lens.secondaryLoop,
      lens.id
    );
  }
  return decorateGameplayFusionTemplates(
    gameplayFusionTemplates(state.gameplayTuning.primaryLoop, state.gameplayTuning.secondaryLoop),
    state.gameplayTuning.primaryLoop,
    state.gameplayTuning.secondaryLoop,
    gameplayFusionLensIdFromTuning(state.gameplayTuning)
  );
}

function normalizeGameplayFusionTemplate() {
  normalizeGameplayLoopPair();
  state.gameplayTuning.fusionTemplate = normalizeGameplayFusionTemplateValue(
    state.gameplayTuning.primaryLoop,
    state.gameplayTuning.secondaryLoop,
    state.gameplayTuning.fusionTemplate
  );
}

function normalizeGameplayLoopPair() {
  if (state.gameplayTuning.secondaryLoop === state.gameplayTuning.primaryLoop) {
    state.gameplayTuning.secondaryLoop = "";
  }
}

function normalizeGameplayFusionTemplateValue(primaryLoop, secondaryLoop, value) {
  const templates = gameplayFusionTemplates(primaryLoop, secondaryLoop);
  return templates.some((template) => template.id === value) ? value : templates[0].id;
}

function activeGameplayFusionTemplate(experiment = activeGameplayExperiment()) {
  const primaryLoop = experiment?.primaryLoop || state.gameplayTuning.primaryLoop;
  const secondaryLoop = experiment?.secondaryLoop || state.gameplayTuning.secondaryLoop;
  const value = experiment?.fusionTemplate || state.gameplayTuning.fusionTemplate;
  return gameplayFusionTemplates(primaryLoop, secondaryLoop).find((template) => template.id === value) || gameplayFusionTemplates(primaryLoop, secondaryLoop)[0];
}

function fusionModeFromTemplate(templateId) {
  const templates = gameplayFusionTemplates(state.gameplayTuning.primaryLoop, state.gameplayTuning.secondaryLoop);
  return (templates.find((template) => template.id === templateId)?.mode || "light");
}

function gameplayTemplateDescription(value) {
  const template = gameplayFusionTemplates(state.gameplayTuning.primaryLoop, state.gameplayTuning.secondaryLoop).find((item) => item.id === value) || activeGameplayFusionTemplate();
  return `${template.label}：${template.description}`;
}

function gameplayFusionTemplateMeta(template) {
  const spec = gameplayRuleSpec(template.id);
  const modeLabel = {
    dual: "大胆融合",
    primary: "主导融合",
    light: "轻量插入"
  }[template.mode || spec?.mode] || "可试玩";
  const pairLabel = template.primaryLoop && template.secondaryLoop
    ? template.isRecommendation && template.sourceLensId === "random"
      ? "随机实验"
      : `${primaryLoopLabel(template.primaryLoop)} × ${secondaryLoopLabel(template.secondaryLoop)}`
    : "";
  const detail = spec?.fusionTiming ? `${modeLabel} · ${spec.fusionTiming}` : modeLabel;
  return pairLabel ? `${pairLabel} · ${detail}` : detail;
}

function renderGameplayFusionLab() {
  if (!gameplayFusionOrbit || !fusionFocusSummary) return;
  const activeId = currentGameplayFusionLensId();
  const activeLens = activeGameplayFusionLensPreset(activeId);
  initGameplayFusionGlobe();
  renderGameplayFusionGlobeLabels(activeId);
  updateGameplayFusionGlobe(activeId);
  const centerTitle = gameplayFusionOrbit.querySelector(".fusion-globe-center strong");
  if (centerTitle) centerTitle.textContent = primaryLoopLabel(state.gameplayTuning.primaryLoop);
  if (fusionCustomRow) fusionCustomRow.hidden = activeId !== "custom";
  if (fusionCustomInput && document.activeElement !== fusionCustomInput) {
    fusionCustomInput.value = state.gameplayCustomFusionPrompt || "";
  }
  const directionTarget = activeId === "random"
    ? "随机推荐"
    : activeId === "custom"
      ? activeLens.title
      : (activeLens.secondaryLoop ? secondaryLoopLabel(activeLens.secondaryLoop) : activeLens.label);
  const directionLabel = `${primaryLoopLabel(state.gameplayTuning.primaryLoop)} X ${directionTarget}`;
  fusionFocusSummary.innerHTML = `
    <div>
      <strong>当前方向：${escapeHtml(directionLabel)}</strong>
    </div>
  `;
}

function initGameplayFusionGlobe() {
  if (gameplayFusionGlobe || !fusionGlobeCanvas || !gameplayFusionOrbit || !fusionGlobeLabels) return;
  if (!window.THREE) {
    gameplayFusionOrbit.classList.add("fusion-globe-fallback");
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas: fusionGlobeCanvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 4.65);

  const globeRadius = 1.25;
  const group = new THREE.Group();
  scene.add(group);

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(globeRadius, 64, 32),
    new THREE.MeshStandardMaterial({
      color: 0xf8ffff,
      transparent: true,
      opacity: 0.22,
      roughness: 0.72,
      metalness: 0.08
    })
  );
  group.add(globe);

  const grid = new THREE.Mesh(
    new THREE.SphereGeometry(globeRadius * 1.006, 32, 16),
    new THREE.MeshBasicMaterial({
      color: 0x0f766e,
      transparent: true,
      opacity: 0.12,
      wireframe: true
    })
  );
  group.add(grid);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(globeRadius * 1.12, 64, 32),
    new THREE.MeshBasicMaterial({
      color: 0xdff7f5,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    })
  );
  scene.add(halo);

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(-2, 2, 4);
  scene.add(keyLight);
  const sideLight = new THREE.DirectionalLight(0x5eead4, 0.75);
  sideLight.position.set(3, -1, 2);
  scene.add(sideLight);

  const nodes = new Map();
  const dotGeometry = new THREE.SphereGeometry(0.055, 24, 16);
  const ringGeometry = new THREE.TorusGeometry(0.095, 0.008, 10, 40);
  gameplayVisibleFusionLensPresets().forEach((lens) => {
    const position = fusionGlobeVector(lens, globeRadius * 1.055);
    const material = new THREE.MeshBasicMaterial({ color: lens.color || "#0f766e" });
    const dot = new THREE.Mesh(dotGeometry, material);
    dot.position.copy(position);
    group.add(dot);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: lens.color || "#0f766e",
      transparent: true,
      opacity: 0.36
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(position);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize());
    group.add(ring);

    nodes.set(lens.id, { lens, position, dot, ring, material, ringMaterial });
  });

  gameplayFusionGlobe = {
    renderer,
    scene,
    camera,
    group,
    globeRadius,
    nodes,
    activeId: null,
    targetRotation: { x: -0.12, y: 0.72 },
    dragging: false,
    lastPointer: { x: 0, y: 0 },
    resizeObserver: null,
    animationFrame: null
  };

  gameplayFusionOrbit.addEventListener("pointerdown", handleFusionGlobePointerDown);
  window.addEventListener("pointermove", handleFusionGlobePointerMove);
  window.addEventListener("pointerup", handleFusionGlobePointerUp);
  gameplayFusionGlobe.resizeObserver = new ResizeObserver(resizeGameplayFusionGlobe);
  gameplayFusionGlobe.resizeObserver.observe(gameplayFusionOrbit);
  resizeGameplayFusionGlobe();
  animateGameplayFusionGlobe();
}

function fusionGlobeVector(lens, radius = 1) {
  const lat = THREE.MathUtils.degToRad(lens.globe?.lat || 0);
  const lon = THREE.MathUtils.degToRad(lens.globe?.lon || 0);
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon)
  );
}

function resizeGameplayFusionGlobe() {
  if (!gameplayFusionGlobe || !gameplayFusionOrbit) return;
  const rect = gameplayFusionOrbit.getBoundingClientRect();
  const width = Math.max(220, Math.floor(rect.width));
  const height = Math.max(180, Math.floor(rect.height));
  gameplayFusionGlobe.renderer.setSize(width, height, false);
  gameplayFusionGlobe.camera.aspect = width / height;
  gameplayFusionGlobe.camera.updateProjectionMatrix();
  positionGameplayFusionGlobeLabels();
}

function handleFusionGlobePointerDown(event) {
  if (!gameplayFusionGlobe || event.target.closest("[data-fusion-lens], input, button")) return;
  gameplayFusionGlobe.dragging = true;
  gameplayFusionGlobe.lastPointer = { x: event.clientX, y: event.clientY };
  gameplayFusionOrbit.setPointerCapture?.(event.pointerId);
  gameplayFusionOrbit.classList.add("is-dragging");
}

function handleFusionGlobePointerMove(event) {
  const globe = gameplayFusionGlobe;
  if (!globe?.dragging) return;
  const dx = event.clientX - globe.lastPointer.x;
  const dy = event.clientY - globe.lastPointer.y;
  globe.group.rotation.y += dx * 0.009;
  globe.group.rotation.x = clamp(globe.group.rotation.x + dy * 0.006, -1.05, 1.05);
  globe.targetRotation.x = globe.group.rotation.x;
  globe.targetRotation.y = globe.group.rotation.y;
  globe.lastPointer = { x: event.clientX, y: event.clientY };
  positionGameplayFusionGlobeLabels();
}

function handleFusionGlobePointerUp(event) {
  if (!gameplayFusionGlobe?.dragging) return;
  gameplayFusionGlobe.dragging = false;
  gameplayFusionOrbit.releasePointerCapture?.(event.pointerId);
  gameplayFusionOrbit.classList.remove("is-dragging");
}

function renderGameplayFusionGlobeLabels(activeId) {
  if (!fusionGlobeLabels) return;
  fusionGlobeLabels.innerHTML = gameplayVisibleFusionLensPresets().map((lens) => `
    <button
      class="fusion-globe-tag fusion-globe-tag-${escapeAttribute(lens.tone || "slate")} ${lens.id === activeId ? "active" : ""} ${lens.disabled ? "disabled" : ""}"
      type="button"
      role="option"
      aria-selected="${lens.id === activeId}"
      aria-disabled="${lens.disabled ? "true" : "false"}"
      data-fusion-lens="${escapeAttribute(lens.id)}"
      ${lens.disabled ? "disabled" : ""}
    >
      <span class="material-symbols-rounded" aria-hidden="true">${escapeHtml(lens.icon)}</span>
      <strong>${escapeHtml(lens.label)}</strong>
    </button>
  `).join("");
  positionGameplayFusionGlobeLabels();
}

function updateGameplayFusionGlobe(activeId) {
  const globe = gameplayFusionGlobe;
  if (!globe) return;
  globe.nodes.forEach(({ dot, ring, material, ringMaterial }, id) => {
    const active = id === activeId;
    const lens = gameplayFusionLensPresets.find((item) => item.id === id);
    material.color.set(active ? "#ffffff" : (lens?.color || "#0f766e"));
    ringMaterial.opacity = lens?.disabled ? 0.16 : active ? 0.78 : 0.34;
    dot.scale.setScalar(lens?.disabled ? 0.82 : active ? 1.55 : 1);
    ring.scale.setScalar(lens?.disabled ? 0.86 : active ? 1.42 : 1);
  });
  if (globe.activeId !== activeId) {
    focusGameplayFusionGlobe(activeId, globe.activeId === null);
    globe.activeId = activeId;
  }
  positionGameplayFusionGlobeLabels();
}

function focusGameplayFusionGlobe(activeId, immediate = false) {
  const globe = gameplayFusionGlobe;
  if (!globe) return;
  const lens = gameplayFusionLensPresets.find((item) => item.id === activeId);
  const focus = lens?.focusRotation || { x: 0, y: 0 };
  globe.targetRotation = { x: focus.x, y: focus.y };
  if (immediate) {
    globe.group.rotation.x = focus.x;
    globe.group.rotation.y = focus.y;
  }
}

function animateGameplayFusionGlobe() {
  const globe = gameplayFusionGlobe;
  if (!globe) return;
  if (!globe.dragging) {
    globe.group.rotation.x += (globe.targetRotation.x - globe.group.rotation.x) * 0.055;
    globe.group.rotation.y += (globe.targetRotation.y - globe.group.rotation.y) * 0.055;
  }
  globe.renderer.render(globe.scene, globe.camera);
  positionGameplayFusionGlobeLabels();
  globe.animationFrame = requestAnimationFrame(animateGameplayFusionGlobe);
}

function positionGameplayFusionGlobeLabels() {
  const globe = gameplayFusionGlobe;
  if (!globe || !fusionGlobeLabels) return;
  const rect = gameplayFusionOrbit.getBoundingClientRect();
  const width = rect.width || 1;
  const height = rect.height || 1;
  globe.group.updateMatrixWorld(true);

  globe.nodes.forEach(({ position }, id) => {
    const label = fusionGlobeLabels.querySelector(`[data-fusion-lens="${CSS.escape(id)}"]`);
    if (!label) return;
    const world = position.clone().applyMatrix4(globe.group.matrixWorld);
    const projected = world.clone().project(globe.camera);
    const rawX = (projected.x * 0.5 + 0.5) * width;
    const rawY = (-projected.y * 0.5 + 0.5) * height;
    const labelWidth = label.offsetWidth || 96;
    const labelHeight = label.offsetHeight || 40;
    const x = clamp(rawX, labelWidth / 2 + 8, width - labelWidth / 2 - 8);
    const y = clamp(rawY, labelHeight / 2 + 8, height - labelHeight / 2 - 8);
    const depth = clamp((world.z + globe.globeRadius) / (globe.globeRadius * 2), 0, 1);
    const front = world.z > -0.1;
    const scale = 0.82 + depth * 0.22;
    label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
    label.style.opacity = String(front ? 0.58 + depth * 0.42 : 0.12);
    label.style.zIndex = String(10 + Math.round(depth * 60));
  });
}

function activeGameplayFusionLensPreset(activeId = currentGameplayFusionLensId()) {
  if (activeId === "custom") {
    const prompt = state.gameplayCustomFusionPrompt.trim();
    return {
      ...gameplayFusionLensPresets.find((lens) => lens.id === "custom"),
      title: prompt ? `自定义：${shortFusionPrompt(prompt)}` : "自定义方向",
      summary: prompt ? `已按“${prompt}”转译为当前可试玩的融合候选。` : "输入一句想要的融合感觉，AI 会转译为当前可试玩的候选组合。"
    };
  }
  return gameplayFusionLensPresets.find((lens) => lens.id === activeId) || gameplayFusionLensPresets[0];
}

function currentGameplayFusionLensId() {
  if (state.gameplayFusionLens === "custom") return "custom";
  if (!state.gameplayTuning.secondaryLoop && state.gameplayFusionLens !== "custom") return "random";
  if (gameplayClickableFusionLensPresets().some((lens) => lens.id === state.gameplayFusionLens)) {
    return state.gameplayFusionLens;
  }
  return gameplayFusionLensIdFromTuning(state.gameplayTuning) || "random";
}

function gameplayFusionLensIdFromTuning(tuning) {
  if (state.gameplayFusionLens === "custom" && state.gameplayCustomFusionTarget && matchesGameplayFusionTarget(tuning, state.gameplayCustomFusionTarget)) {
    return "custom";
  }
  if (!tuning.secondaryLoop) return "random";
  const currentLens = gameplayFusionLensPresets.find((lens) => lens.id === state.gameplayFusionLens);
  if (
    currentLens &&
    !currentLens.isMeta &&
    currentLens.primaryLoop === tuning.primaryLoop &&
    currentLens.secondaryLoop === tuning.secondaryLoop
  ) {
    return currentLens.id;
  }
  const pairLens = gameplayFusionLensIdForPair(tuning.primaryLoop, tuning.secondaryLoop);
  if (pairLens !== "random") return pairLens;
  const fusionTemplate = normalizeGameplayFusionTemplateValue(tuning.primaryLoop, tuning.secondaryLoop, tuning.fusionTemplate);
  const exact = gameplayFusionLensPresets.find((lens) =>
    !lens.isMeta &&
    lens.primaryLoop === tuning.primaryLoop &&
    lens.secondaryLoop === tuning.secondaryLoop &&
    lens.fusionTemplate === fusionTemplate
  );
  if (exact) return exact.id;
  return gameplayFusionLensIdForPair(tuning.primaryLoop, tuning.secondaryLoop);
}

function matchesGameplayFusionTarget(tuning, target) {
  if (!target) return false;
  const fusionTemplate = normalizeGameplayFusionTemplateValue(tuning.primaryLoop, tuning.secondaryLoop, tuning.fusionTemplate);
  return tuning.primaryLoop === target.primaryLoop &&
    tuning.secondaryLoop === target.secondaryLoop &&
    fusionTemplate === target.fusionTemplate;
}

function applyNextGameplayFusionLens() {
  const current = currentGameplayFusionLensId();
  const currentIndex = gameplayFusionLensCycle.indexOf(current);
  const nextId = gameplayFusionLensCycle[(currentIndex + 1 + gameplayFusionLensCycle.length) % gameplayFusionLensCycle.length];
  applyGameplayFusionLens(nextId);
}

function applyGameplayFusionLens(lensId) {
  const lens = gameplayFusionLensPresets.find((item) => item.id === lensId);
  if (lens?.disabled) {
    chatNotice.textContent = `「${lens.label}」方向暂未接入可试玩融合方案。`;
    return;
  }
  if (!lens || lens.id === "custom") {
    showFusionCustomInput();
    return;
  }
  state.gameplayFusionLens = lens.id;
  state.gameplayCustomFusionTarget = null;
  if (lens.isMeta) {
    chatNotice.textContent = `AI 已切换到「${lens.title}」，下方候选已更新。`;
    renderGameplayEditor();
    return;
  }
  state.gameplayTuning.primaryLoop = lens.primaryLoop;
  state.gameplayTuning.secondaryLoop = lens.secondaryLoop;
  state.gameplayTuning.fusionTemplate = lens.fusionTemplate;
  chatNotice.textContent = `AI 已切换到「${lens.title}」，下方候选已更新。`;
  applyGameplayTuning();
}

function showFusionCustomInput() {
  state.gameplayFusionLens = "custom";
  renderGameplayFusionLab();
  requestAnimationFrame(() => fusionCustomInput?.focus());
}

function applyCustomGameplayFusionPrompt() {
  const prompt = fusionCustomInput.value.trim();
  if (!prompt) {
    fusionCustomInput.focus();
    return;
  }
  const target = inferCustomGameplayFusionTarget(prompt);
  state.gameplayFusionLens = "custom";
  state.gameplayCustomFusionPrompt = prompt;
  state.gameplayCustomFusionTarget = target;
  state.gameplayTuning.primaryLoop = target.primaryLoop;
  state.gameplayTuning.secondaryLoop = target.secondaryLoop;
  state.gameplayTuning.fusionTemplate = target.fusionTemplate;
  chatNotice.textContent = `AI 已按「${prompt}」生成可试玩融合候选。`;
  applyGameplayTuning();
}

function inferCustomGameplayFusionTarget(prompt) {
  const text = prompt.toLowerCase();
  if (/风险|契约|赌|高收益|pressure|risk/.test(text)) {
    return {
      primaryLoop: "core_loop.wave_defense",
      secondaryLoop: "core_loop.deck_builder",
      fusionTemplate: "risk_contract"
    };
  }
  if (/英雄|武将|救场|救火|hero/.test(text)) {
    return gameplayFusionTargetFromLens("moba");
  }
  if (/幸存|割草|包围|走位|surviv/.test(text)) {
    return gameplayFusionTargetFromLens("survival");
  }
  if (/牌组|卡组|建造|布阵|战棋|回合|deck|turn/.test(text)) {
    return {
      primaryLoop: "core_loop.wave_defense",
      secondaryLoop: "core_loop.deck_builder",
      fusionTemplate: "build_cards"
    };
  }
  if (/卡牌|出牌|抽牌|card/.test(text)) {
    return gameplayFusionTargetFromLens("card");
  }
  if (/自走棋|自动战斗|阵容|auto.?chess|auto.?battler/.test(text)) {
    return gameplayFusionTargetFromLens("autochess");
  }
  return gameplayFusionTargetFromLens("roguelite");
}

function gameplayFusionTargetFromLens(lensId) {
  const lens = gameplayFusionLensPresets.find((item) => item.id === lensId) || gameplayFusionLensPresets[0];
  return {
    primaryLoop: lens.primaryLoop,
    secondaryLoop: lens.secondaryLoop,
    fusionTemplate: lens.fusionTemplate
  };
}

function shortFusionPrompt(prompt) {
  return prompt.length > 12 ? `${prompt.slice(0, 12)}...` : prompt;
}

function gameplayThemeLabel(value) {
  return {
    three_kingdoms: "三国题材",
    journey_to_west: "西游题材",
    wuxia: "武侠题材",
    xianxia: "仙侠题材",
    post_apocalypse: "末日题材",
    zombie: "僵尸题材",
    sci_fi: "科幻题材",
    cyberpunk: "赛博题材",
    fantasy_magic: "魔法题材",
    generic: "通用题材"
  }[value] || "通用题材";
}

function blueprintLabel(id) {
  return {
    "blueprint.balatro_like": "Balatro 式卡牌增益",
    "blueprint.kingdom_rush_like": "Kingdom Rush 式波次塔防",
    "blueprint.vampire_survivors_like": "幸存者式成长",
    "blueprint.plants_vs_zombies_like": "PVZ 式路线防守",
    "blueprint.slay_the_spire_like": "爬塔卡牌",
    "blueprint.auto_chess_like": "自走棋"
  }[id] || readableGameplayId(id);
}

function enemyPressureLabel(value) {
  return `压力${gameplayPressureConfig(value).label}`;
}

function resourcePaceLabel(value) {
  return {
    tight: "资源紧张",
    standard: "资源标准",
    loose: "资源宽松"
  }[value] || "资源标准";
}

function readableGameplayId(id) {
  return String(id || "").replace(/^core_loop\./, "").replace(/^module\./, "").replace(/^blueprint\./, "").replace(/^fusion\./, "").replaceAll("_", " ");
}

function gameplayEntityColor(type) {
  return {
    enemy: "#ef4444",
    tower: "#2563eb",
    base: "#111827",
    player: "#22c55e",
    player_unit: "#22c55e",
    card: "#f59e0b",
    resource: "#06b6d4"
  }[type] || "#8b5cf6";
}

function updateGameplayRuntime(now = performance.now()) {
  const runtime = state.gameplayRuntime;
  if (!state.gameplaySkeleton || !runtime.running) {
    runtime.lastUpdate = now;
    return;
  }
  if (runtime.mode === "survival_growth") {
    updateSurvivalGrowthRuntime(now);
    return;
  }
  if (runtime.mode === "deck_builder" || runtime.mode === "unsupported") {
    runtime.lastUpdate = now;
    return;
  }
  const delta = Math.min(0.05, Math.max(0, (now - (runtime.lastUpdate || now)) / 1000));
  runtime.lastUpdate = now;
  if (runtime.result || runtime.upgradeChoices.length || runtime.towerMenu) return;
  if (runtime.waveState === "planning") return;
  runtime.time += delta;
  moveGameplayHero(delta);
  updateWaveDefenseSurvivalFusion(delta);
  if (runtime.waveState === "break") {
    runtime.waveBreak -= delta;
    if (runtime.waveBreak <= 0) startNextGameplayWave();
  }
  runtime.spawnTimer -= delta;
  if (runtime.waveState === "spawning" && runtime.spawnTimer <= 0 && runtime.waveSpawned < runtime.waveTarget) {
    spawnGameplayEnemy();
    runtime.spawnTimer = Math.max(0.35, runtime.spawnIntervalBase - runtime.wave * 0.04);
  }
  updateGameplayEnemies(delta);
  updateGameplayTowers(delta);
  updateGameplayProjectiles(delta);
  updateGameplayWaveState();
  if (runtime.baseHp <= 0) {
    runtime.running = false;
    runtime.result = "defeat";
    runtime.message = "试玩：基地被攻破，点击试玩重新开始";
  }
  if (runtime.fusion.mode === "surround_zone_defense" && runtime.heroEnabled && runtime.hero.hp <= 0) {
    runtime.running = false;
    runtime.result = "defeat";
    runtime.message = "英雄被包围击倒，防守失败";
  }
}

function updateWaveDefenseSurvivalFusion(delta) {
  const runtime = state.gameplayRuntime;
  if (runtime.mode !== "wave_defense" || runtime.hero?.mode !== "free") return;
  if (!["free_hero_rescue", "surround_zone_defense", "hero_growth_defense"].includes(runtime.fusion.mode)) return;
  runtime.fusion.survivalSpawnTimer = (runtime.fusion.survivalSpawnTimer || 2) - delta;
  if (runtime.fusion.survivalSpawnTimer > 0) return;
  runtime.fusion.survivalSpawnTimer = Math.max(1.8, (runtime.fusion.survivalSpawnInterval || 5) - runtime.wave * 0.18);
  if (runtime.fusion.mode === "surround_zone_defense") {
    spawnWaveDefenseSurvivalEnemy("hunter");
    if (runtime.wave >= 2) spawnWaveDefenseSurvivalEnemy("hunter");
    return;
  }
  if (runtime.fusion.mode === "free_hero_rescue") {
    spawnWaveDefenseSurvivalEnemy("side_base");
    return;
  }
  if (runtime.fusion.mode === "hero_growth_defense") {
    spawnWaveDefenseSurvivalEnemy(runtime.kills % 2 === 0 ? "side_base" : "hunter");
  }
}

function spawnWaveDefenseSurvivalEnemy(behavior) {
  const runtime = state.gameplayRuntime;
  const edge = Math.floor(Math.random() * 4);
  const point = [
    { x: Math.random() * MAP_WIDTH, y: 104 },
    { x: MAP_WIDTH - 28, y: 180 + Math.random() * (MAP_HEIGHT - 300) },
    { x: Math.random() * MAP_WIDTH, y: MAP_HEIGHT - 64 },
    { x: 28, y: 180 + Math.random() * (MAP_HEIGHT - 300) }
  ][edge];
  const hpBase = behavior === "hunter" ? 11 : 14;
  const hp = (hpBase + runtime.wave * 1.6) * runtime.enemyHpMultiplier;
  runtime.enemies.push({
    id: nextId(behavior === "hunter" ? "hunter" : "raider"),
    type: behavior,
    name: behavior === "hunter" ? "追猎者" : "侧翼兵",
    x: point.x,
    y: point.y,
    hp,
    maxHp: hp,
    speed: (behavior === "hunter" ? 82 : 66) * runtime.enemySpeedMultiplier,
    progress: 0,
    behavior,
    reward: runtime.killReward + 1
  });
}

function updateSurvivalGrowthRuntime(now = performance.now()) {
  const runtime = state.gameplayRuntime;
  const delta = Math.min(0.05, Math.max(0, (now - (runtime.lastUpdate || now)) / 1000));
  runtime.lastUpdate = now;
  if (runtime.result || runtime.upgradeChoices.length) return;
  runtime.time += delta;
  updateSurvivalFusionEffects(delta);
  moveSurvivalPlayer(delta);
  runtime.spawnTimer -= delta;
  if (runtime.spawnTimer <= 0) {
    spawnSurvivalEnemy();
    for (let i = 0; i < (runtime.fusion.risk.extraSpawn || 0); i += 1) spawnSurvivalEnemy();
    runtime.spawnTimer = Math.max(0.25, runtime.spawnIntervalBase - runtime.player.level * 0.02);
  }
  updateSurvivalEnemies(delta);
  updateSurvivalOrbs(delta);
  updateSurvivalCardFusion(delta);
  updateSurvivalTowerFusion(delta);
  updateGameplayProjectiles(delta);
  if (runtime.time >= runtime.runGoalSeconds) {
    runtime.running = false;
    runtime.result = "victory";
    runtime.message = `试玩：生存 ${Math.round(runtime.runGoalSeconds)} 秒成功，击杀 ${runtime.kills}`;
  }
  if (runtime.player.hp <= 0) {
    runtime.running = false;
    runtime.result = "defeat";
    runtime.message = "试玩：角色倒下，点击试玩重新开始";
  }
  if (runtime.fusion.mode === "survival_base_zone" && runtime.fusion.base?.hp <= 0) {
    runtime.running = false;
    runtime.result = "defeat";
    runtime.message = "试玩：据点被摧毁，防守失败";
  }
}

function updateSurvivalFusionEffects(delta) {
  const runtime = state.gameplayRuntime;
  if (!runtime.fusion?.activeEffects?.length) return;
  runtime.fusion.activeEffects.forEach((effect) => {
    effect.remaining -= delta;
  });
  runtime.fusion.activeEffects = runtime.fusion.activeEffects.filter((effect) => {
    if (effect.remaining > 0) return true;
    if (effect.id === "fury") runtime.player.damage /= effect.multiplier;
    if (effect.id === "haste") runtime.player.cooldownBase /= effect.multiplier;
    if (effect.id === "snare") runtime.cardBonus.slow /= effect.multiplier;
    return false;
  });
}

function updateSurvivalCardFusion(delta) {
  const runtime = state.gameplayRuntime;
  if (!isSurvivalCardDeckMode(runtime.fusion.mode)) return;
  runtime.fusion.drawTimer -= delta;
  if (runtime.fusion.drawTimer <= 0) {
    drawSurvivalFusionCards(runtime, runtime.fusion.drawPerTrigger || 1);
    runtime.fusion.drawTimer = runtime.fusion.drawInterval;
    runtime.message = `试玩：从牌库抽 ${runtime.fusion.drawPerTrigger || 1} 张，手牌满时停抽`;
  }
  runtime.cards = runtime.fusion.hand;
}

function isSurvivalCardDeckMode(mode) {
  return mode === "cards_as_active_skills" || mode === "cards_as_growth_choices";
}

function isSurvivalTowerFusionMode(mode) {
  return mode === "portable_turret_ring" || mode === "survival_base_zone" || mode === "tower_skill_loadout";
}

function isSurvivalTowerSkillMode(mode) {
  return mode === "tower_skill_loadout";
}

function createSurvivalTowerSkillCards() {
  const rewardScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.cardRewardScale || 1;
  const buildScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.constructionCost || 1;
  return [
    { id: "skill_barrage", name: "箭雨", cost: Math.max(1, Math.round(2 * buildScale)), type: "tower_skill_barrage", detail: `对周围敌群造成 ${Math.round(22 * rewardScale)} 伤害`, value: 22 * rewardScale },
    { id: "skill_barricade", name: "路障", cost: Math.max(1, Math.round(1 * buildScale)), type: "tower_skill_barricade", detail: "在脚下放置减速区，持续 8 秒", value: 8 },
    { id: "skill_watchtower", name: "临时塔阵", cost: Math.max(1, Math.round(2 * buildScale)), type: "tower_skill_watchtower", detail: "在身边召唤一座短时炮台", value: 12 }
  ];
}

function updateSurvivalTowerFusion(delta) {
  const runtime = state.gameplayRuntime;
  if (!isSurvivalTowerFusionMode(runtime.fusion.mode)) return;
  runtime.fusion.turrets = runtime.fusion.turrets || [];
  runtime.fusion.barricades = runtime.fusion.barricades || [];
  runtime.fusion.turrets.forEach((turret) => {
    turret.remaining -= delta;
    turret.cooldown = Math.max(0, turret.cooldown - delta);
    if (turret.cooldown > 0) return;
    const target = runtime.enemies.filter((enemy) => distance(enemy, turret) <= turret.range).sort((a, b) => distance(a, turret) - distance(b, turret))[0];
    if (!target) return;
    turret.cooldown = turret.fireRate;
    target.hp -= turret.damage;
    spawnBeamVfx(turret, target, "#2563eb");
    spawnDamageVfx(target, turret.damage, { color: "#2563eb", size: 13 });
    runtime.projectiles.push({ x: turret.x, y: turret.y, targetId: target.id, damage: 0, life: 0.18, survival: true });
  });
  runtime.fusion.turrets = runtime.fusion.turrets.filter((turret) => turret.remaining > 0);
  runtime.fusion.barricades.forEach((zone) => {
    zone.remaining -= delta;
  });
  runtime.fusion.barricades = runtime.fusion.barricades.filter((zone) => zone.remaining > 0);
  const base = runtime.fusion.base;
  if (base?.hp > 0) {
    base.cooldown = Math.max(0, base.cooldown - delta);
    if (base.cooldown <= 0) {
      const target = runtime.enemies.filter((enemy) => distance(enemy, base) <= base.range).sort((a, b) => distance(a, base) - distance(b, base))[0];
      if (target) {
        base.cooldown = Math.max(0.35, 0.9 - base.level * 0.08);
        target.hp -= base.damage;
        spawnBeamVfx(base, target, "#0f172a");
        spawnDamageVfx(target, base.damage, { color: "#0f172a", size: 13 });
        runtime.projectiles.push({ x: base.x, y: base.y, targetId: target.id, damage: 0, life: 0.22, survival: true });
      }
    }
  }
}

function moveGameplayHero(delta) {
  const runtime = state.gameplayRuntime;
  if (!runtime.heroEnabled) return;
  if (runtime.hero.defeatedTimer > 0) {
    runtime.hero.defeatedTimer -= delta;
    if (runtime.hero.defeatedTimer <= 0) {
      const revivePoint = pointOnRoute(runtime.route, 0.72);
      runtime.hero.x = revivePoint.x;
      runtime.hero.y = revivePoint.y;
      runtime.hero.hp = Math.round(runtime.hero.maxHp * 0.6);
      runtime.message = "试玩：英雄已回到路线继续防守";
    }
    return;
  }
  let dx = 0;
  let dy = 0;
  if (state.pressedKeys.has("w") || state.pressedKeys.has("arrowup")) dy -= 1;
  if (state.pressedKeys.has("s") || state.pressedKeys.has("arrowdown")) dy += 1;
  if (state.pressedKeys.has("a") || state.pressedKeys.has("arrowleft")) dx -= 1;
  if (state.pressedKeys.has("d") || state.pressedKeys.has("arrowright")) dx += 1;
  const length = Math.hypot(dx, dy) || 1;
  const next = {
    x: runtime.hero.x + (dx / length) * 230 * delta,
    y: runtime.hero.y + (dy / length) * 230 * delta
  };
  if (runtime.hero.mode === "free") {
    runtime.hero.x = clamp(next.x, 35, MAP_WIDTH - 35);
    runtime.hero.y = clamp(next.y, 80, MAP_HEIGHT - 35);
  } else {
    const progress = closestRouteProgress(runtime.route, next);
    const routePoint = pointOnRoute(runtime.route, progress);
    runtime.hero.x = routePoint.x;
    runtime.hero.y = routePoint.y;
  }
  runtime.hero.cooldown = Math.max(0, runtime.hero.cooldown - delta);
  if (runtime.heroEnabled && runtime.hero.hp > 0) {
    const target = runtime.enemies.find((enemy) => distance(enemy, runtime.hero) < 96);
    if (target && runtime.hero.cooldown <= 0) {
      const damage = 6 * runtime.heroDamageMultiplier;
      target.hp -= damage;
      spawnBeamVfx(runtime.hero, target, "#22c55e");
      spawnDamageVfx(target, damage, { color: "#22c55e", size: 13 });
      runtime.hero.cooldown = 0.55;
    }
  }
}

function moveSurvivalPlayer(delta) {
  const runtime = state.gameplayRuntime;
  const player = runtime.player;
  let dx = 0;
  let dy = 0;
  if (state.pressedKeys.has("w") || state.pressedKeys.has("arrowup")) dy -= 1;
  if (state.pressedKeys.has("s") || state.pressedKeys.has("arrowdown")) dy += 1;
  if (state.pressedKeys.has("a") || state.pressedKeys.has("arrowleft")) dx -= 1;
  if (state.pressedKeys.has("d") || state.pressedKeys.has("arrowright")) dx += 1;
  const length = Math.hypot(dx, dy) || 1;
  player.x = clamp(player.x + (dx / length) * player.speed * delta, 32, MAP_WIDTH - 32);
  player.y = clamp(player.y + (dy / length) * player.speed * delta, 150, MAP_HEIGHT - 44);
  player.cooldown = Math.max(0, player.cooldown - delta);
  const target = runtime.enemies.filter((enemy) => distance(enemy, player) <= player.attackRange).sort((a, b) => distance(a, player) - distance(b, player))[0];
  if (target && player.cooldown <= 0) {
    const damage = player.damage * runtime.cardBonus.damage;
    target.hp -= damage;
    player.cooldown = Math.max(0.18, (player.cooldownBase || 0.55) / fusionAttackRateMultiplier(activeGameplayExperiment()));
    spawnBeamVfx(player, target, "#22c55e");
    spawnDamageVfx(target, damage, { color: "#22c55e", size: 13 });
    runtime.projectiles.push({ x: player.x, y: player.y, targetId: target.id, damage: 0, life: 0.25, survival: true });
  }
}

function spawnSurvivalEnemy() {
  const runtime = state.gameplayRuntime;
  const edge = Math.floor(Math.random() * 4);
  const point = [
    { x: Math.random() * MAP_WIDTH, y: 120 },
    { x: MAP_WIDTH - 20, y: 160 + Math.random() * (MAP_HEIGHT - 220) },
    { x: Math.random() * MAP_WIDTH, y: MAP_HEIGHT - 20 },
    { x: 20, y: 160 + Math.random() * (MAP_HEIGHT - 220) }
  ][edge];
  const hp = (8 + runtime.player.level * 1.2) * runtime.enemyHpMultiplier;
  const speed = (62 + runtime.player.level * 2) * runtime.enemySpeedMultiplier;
  runtime.enemies.push({
    id: nextId("surv"),
    x: point.x,
    y: point.y,
    hp,
    maxHp: hp,
    speed,
    baseSpeed: speed,
    reward: runtime.killReward
  });
}

function updateSurvivalEnemies(delta) {
  const runtime = state.gameplayRuntime;
  const player = runtime.player;
  runtime.enemies.forEach((enemy) => {
    const base = runtime.fusion.mode === "survival_base_zone" ? runtime.fusion.base : null;
    const target = base?.hp > 0 && distance(enemy, base) < distance(enemy, player) * 1.2 ? base : player;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    const zoneSlow = survivalTowerZoneSlow(enemy);
    const effectiveSpeed = (enemy.baseSpeed || enemy.speed) * runtime.cardBonus.slow * zoneSlow;
    enemy.x += (dx / length) * effectiveSpeed * delta;
    enemy.y += (dy / length) * effectiveSpeed * delta;
    if (target === player && distance(enemy, player) < 24) {
      player.hp = Math.max(0, player.hp - 10 * delta);
    }
    if (target === base && distance(enemy, base) < 30) {
      base.hp = Math.max(0, base.hp - (8 + runtime.player.level) * delta);
    }
  });
  runtime.enemies = runtime.enemies.filter((enemy) => {
    if (enemy.hp > 0) return true;
    runtime.gold += enemy.reward;
    runtime.kills += 1;
    runtime.score += 12 + Math.round(runtime.time / 10);
    runtime.orbs.push({ x: enemy.x, y: enemy.y, value: runtime.expPerKill });
    onSurvivalKillFusionReward(runtime);
    onSurvivalTowerFusionKillReward(runtime);
    return false;
  });
}

function survivalTowerZoneSlow(enemy) {
  const runtime = state.gameplayRuntime;
  if (!runtime.fusion?.barricades?.length) return 1;
  return runtime.fusion.barricades.some((zone) => distance(enemy, zone) <= zone.radius) ? 0.52 : 1;
}

function onSurvivalKillFusionReward(runtime) {
  if (!isSurvivalCardDeckMode(runtime.fusion.mode)) return;
  runtime.fusion.energyBank = (runtime.fusion.energyBank || 0) + (runtime.fusion.energyPerKill || 1);
  while (runtime.fusion.energyBank >= 1) {
    runtime.fusion.energy = Math.min(runtime.fusion.maxEnergy, runtime.fusion.energy + 1);
    runtime.fusion.energyBank -= 1;
  }
  if (runtime.kills % (runtime.fusion.killDrawInterval || 5) === 0) {
    drawSurvivalFusionCards(runtime, runtime.fusion.drawPerTrigger || 1);
  }
}

function onSurvivalTowerFusionKillReward(runtime) {
  if (!isSurvivalTowerFusionMode(runtime.fusion.mode)) return;
  const resourceScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.resourceGenerosity || 1;
  const gain = resourceScale >= 1.45 ? 2 : 1;
  runtime.fusion.parts = (runtime.fusion.parts || 0) + gain;
  runtime.fusion.skillCharges = Math.min(runtime.fusion.skillChargeMax || 4, (runtime.fusion.skillCharges || 0) + 1);
}

function updateSurvivalOrbs(delta) {
  const runtime = state.gameplayRuntime;
  const player = runtime.player;
  runtime.orbs.forEach((orb) => {
    if (distance(orb, player) < 120) {
      orb.x += (player.x - orb.x) * Math.min(1, delta * 8);
      orb.y += (player.y - orb.y) * Math.min(1, delta * 8);
    }
  });
  runtime.orbs = runtime.orbs.filter((orb) => {
    if (distance(orb, player) > 22) return true;
    gainSurvivalExp(runtime, orb.value);
    return false;
  });
}

function gainSurvivalExp(runtime, value) {
  runtime.exp += value;
  tryTriggerSurvivalLevelUp(runtime);
}

function tryTriggerSurvivalLevelUp(runtime) {
  if (runtime.upgradeChoices.length) return false;
  const threshold = runtime.player.level * 5;
  if (runtime.exp < threshold) return false;
  runtime.exp -= threshold;
  runtime.player.level += 1;
  runtime.upgradeChoices = createSurvivalUpgradeChoices("survival_growth");
  runtime.message = `试玩：升级到 Lv.${runtime.player.level}，选择成长与构筑`;
  return true;
}

function createSurvivalUpgradeChoices(mode) {
  if (mode === "wave_defense") {
    return [
      { id: "tower_damage", name: "全塔火力", detail: "所有塔伤害 +18%" },
      { id: "hero_damage", name: "武将压制", detail: "英雄伤害 +35%" },
      { id: "base_repair", name: "修补城门", detail: "基地血量 +3" }
    ];
  }
  const experiment = activeGameplayExperiment();
  if (experiment?.secondaryLoop === "core_loop.deck_builder" && experiment.fusionTemplate === "cards_as_growth_choices") {
    return [
      ...shuffleCards(baseSurvivalHeroUpgradeChoices()).slice(0, 3).map((choice) => ({ ...choice, group: "hero" })),
      ...createSurvivalDeckBuildChoices()
    ];
  }
  return shuffleCards(baseSurvivalHeroUpgradeChoices()).slice(0, 3);
}

function baseSurvivalHeroUpgradeChoices() {
  return [
    { id: "damage", name: "武器强化", detail: "伤害 +22%" },
    { id: "range", name: "攻击范围", detail: "范围 +18" },
    { id: "cooldown", name: "出手更快", detail: "攻速 +18%" },
    { id: "speed", name: "身法提升", detail: "移速 +12%" },
    { id: "max_hp", name: "体魄增强", detail: "最大生命 +8 并治疗" }
  ];
}

function createSurvivalDeckBuildChoices() {
  const runtime = state.gameplayRuntime;
  const hasDeckCards = survivalDeckCards(runtime).length > 0;
  const count = activeGameplayExperiment()?.runtimeConfig?.fusionTuning?.deckTargetChoiceCount || 3;
  return [
    { id: "deck_add_skill", group: "deck_action", action: "add", name: "加入技能牌", detail: `从 ${count} 张候选技能牌中选 1 张加入弃牌堆。` },
    { id: "deck_upgrade_skill", group: "deck_action", action: "upgrade", name: "升级一张牌", detail: hasDeckCards ? `从 ${Math.min(count, survivalDeckCards(runtime).length)} 张牌组候选中选 1 张提高数值。` : "当前无牌可升，会改为加入技能牌。" },
    { id: "deck_remove_basic", group: "deck_action", action: "remove", name: "精简牌组", detail: hasDeckCards ? `从 ${Math.min(count, survivalDeckCards(runtime).length)} 张牌组候选中选 1 张删除。` : "当前无牌可删，会改为加入技能牌。" }
  ];
}

function survivalDeckCards(runtime) {
  if (!runtime?.fusion) return [];
  return [...runtime.fusion.hand, ...runtime.fusion.drawPile, ...runtime.fusion.discardPile];
}

function createSurvivalCardInstance(card) {
  return { ...card, instanceId: `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
}

function createTunedSurvivalCardInstance(card, experiment = activeGameplayExperiment(), seed = "") {
  const fusionTuning = experiment?.runtimeConfig?.fusionTuning || createFusionTuningProfile(experiment?.tuning || state.gameplayTuning, experiment?.runtimeConfig?.tuningScales || {});
  const tuned = {
    ...card,
    power: (card.power || 1) * fusionTuning.cardPower,
    cost: Math.max(0, (card.cost || 0) + fusionTuning.cardCostOffset)
  };
  const suffix = seed ? `${seed}-` : "";
  return {
    ...tuned,
    instanceId: `${card.id}-${suffix}${Math.random().toString(36).slice(2, 5)}`
  };
}

function randomSurvivalConstructionCard() {
  return createTunedSurvivalCardInstance(shuffleCards(survivalConstructionCardOptions())[0]);
}

function survivalConstructionCardOptions() {
  return [
    { id: "fury_plus", name: "狂攻", cost: 1, type: "survival_fury", detail: "8秒内伤害提高", power: 1 },
    { id: "sweep_plus", name: "横扫", cost: 2, type: "survival_sweep", detail: "对周围敌人造成范围伤害", power: 1 },
    { id: "snare_plus", name: "绊马索", cost: 1, type: "survival_snare", detail: "短时间降低敌人速度", power: 1 },
    { id: "guard_plus", name: "护体", cost: 1, type: "survival_guard", detail: "恢复生命，提高容错", power: 1 },
    { id: "harvest_plus", name: "收割", cost: 1, type: "survival_harvest", detail: "立即获得经验并吸附掉落", power: 1 }
  ];
}

function createSurvivalCardDeck(experiment) {
  const impact = experiment?.runtimeConfig?.cardImpact || state.gameplayTuning.cardImpact;
  const common = [
    { id: "fury", name: "狂攻", cost: 1, type: "survival_fury", detail: "8秒内伤害 +45%" },
    { id: "sweep", name: "横扫", cost: 2, type: "survival_sweep", detail: "对周围敌人造成范围伤害" },
    { id: "snare", name: "绊马索", cost: 1, type: "survival_snare", detail: "8秒内敌人速度 -25%" },
    { id: "harvest", name: "收割", cost: 1, type: "survival_harvest", detail: "立即获得经验并吸附掉落" },
    { id: "guard", name: "护体", cost: 1, type: "survival_guard", detail: "恢复生命并短暂提高容错" }
  ];
  const focused = {
    gold: [{ id: "bounty", name: "悬赏", cost: 1, type: "survival_bounty", detail: "击杀奖励与分数提高" }],
    tower: [{ id: "fury", name: "军械强化", cost: 1, type: "survival_fury", detail: "8秒内伤害 +45%" }],
    enemy: [{ id: "snare", name: "扰敌", cost: 1, type: "survival_snare", detail: "8秒内敌人速度 -25%" }],
    hero: [{ id: "sweep", name: "武将技", cost: 2, type: "survival_sweep", detail: "对周围敌人造成范围伤害" }]
  }[impact] || [];
  return [...common, ...focused, ...common.slice(0, 2)].map((card, index) => createTunedSurvivalCardInstance(card, experiment, `${index}`));
}

function createSurvivalRiskContracts() {
  const rewardScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.cardRewardScale || 1;
  const riskScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.riskPenaltyScale || 1;
  const choiceCount = activeGameplayExperiment()?.runtimeConfig?.fusionTuning?.eventChoiceCount || 3;
  const pool = [
    { id: "greed_gold", name: "事件：赏金翻倍", type: "risk_gold", detail: `击杀收益 +${Math.max(1, Math.round(1 * rewardScale))}，但每次刷怪额外 +${Math.max(1, Math.round(riskScale))}` },
    { id: "greed_exp", name: "事件：经验汲取", type: "risk_exp", detail: `立即获得 ${Math.round(4 * rewardScale)} 经验，但敌人生命提高` },
    { id: "greed_score", name: "事件：高分追击", type: "risk_score", detail: `分数 +${Math.round(80 * rewardScale)}，但敌人速度提高` },
    { id: "greed_card", name: "事件：禁术抄录", type: "risk_card", detail: `加入 1 张强化技能牌，但刷怪间隔缩短` },
    { id: "greed_heal", name: "事件：血祭续战", type: "risk_heal", detail: `立即治疗 ${Math.round(12 * rewardScale)}，但敌人数量增加` }
  ];
  return shuffleCards(pool).slice(0, choiceCount);
}

function drawSurvivalFusionCards(runtime, count) {
  const fusion = runtime.fusion;
  const maxHand = fusion.maxHand || 4;
  for (let i = 0; i < count; i += 1) {
    if (!fusion.drawPile.length && fusion.discardPile.length) {
      fusion.drawPile = shuffleCards(fusion.discardPile);
      fusion.discardPile = [];
    }
    if (!fusion.drawPile.length || fusion.hand.length >= maxHand) return;
    fusion.hand.push(fusion.drawPile.pop());
  }
  runtime.cards = fusion.hand;
}

function drawWaveBuildCards(runtime, count) {
  const fusion = runtime.fusion;
  const maxHand = fusion.maxHand || 3;
  for (let i = 0; i < count; i += 1) {
    if (!fusion.drawPile.length && fusion.discardPile.length) {
      fusion.drawPile = shuffleCards(fusion.discardPile);
      fusion.discardPile = [];
    }
    if (!fusion.drawPile.length || fusion.hand.length >= maxHand) return;
    fusion.hand.push(fusion.drawPile.pop());
  }
  runtime.cards = fusion.hand;
}

function discardWaveBuildCard(runtime, card) {
  if (!card) return;
  const index = runtime.fusion.hand.findIndex((item) => item.instanceId === card.instanceId);
  if (index >= 0) {
    runtime.fusion.discardPile.push(runtime.fusion.hand.splice(index, 1)[0]);
  } else {
    runtime.fusion.discardPile.push(card);
  }
  drawWaveBuildCards(runtime, 1);
  runtime.cards = runtime.fusion.hand;
}

function handleRuntimeUpgradeChoiceClick(x, y) {
  const runtime = state.gameplayRuntime;
  if (!runtime.upgradeChoices.length) return false;
  const slots = upgradeChoiceSlots(runtime.upgradeChoices);
  const slot = slots.find((item) => y > item.y && y < item.y + item.height && x > item.x && x < item.x + item.width);
  if (!slot) return true;
  if (isGroupedUpgradeChoices(runtime.upgradeChoices)) {
    selectGroupedSurvivalUpgrade(slot.choice);
    return true;
  }
  applySurvivalUpgrade(slot.choice);
  runtime.upgradeChoices = [];
  return true;
}

function isGroupedUpgradeChoices(choices) {
  return choices.some((choice) => ["hero", "deck", "deck_action"].includes(choice.group));
}

function upgradeChoiceSlots(choices) {
  if (!isGroupedUpgradeChoices(choices)) {
    return choices.map((choice, index) => ({
      choice,
      index,
      x: 88 + index * 202,
      y: 516,
      width: 172,
      height: 168
    }));
  }
  const groups = [
    { key: "hero", y: 468 },
    { key: "deck", y: 708 }
  ];
  return groups.flatMap((group) => choices
    .filter((choice) => (choice.group === "deck_action" ? "deck" : choice.group) === group.key)
    .map((choice, index) => ({
      choice,
      index,
      group: group.key,
      x: 88 + index * 202,
      y: group.y,
      width: 172,
      height: 150
    })));
}

function selectGroupedSurvivalUpgrade(choice) {
  const runtime = state.gameplayRuntime;
  if (choice.group === "hero") runtime.fusion.pendingHeroGrowth = choice;
  if (choice.group === "deck_action") {
    runtime.fusion.pendingDeckAction = choice;
    runtime.fusion.pendingDeckBuild = null;
    const heroChoices = runtime.upgradeChoices.filter((item) => item.group === "hero");
    runtime.upgradeChoices = [
      ...heroChoices,
      ...createSurvivalDeckTargetChoices(choice)
    ];
    runtime.message = `试玩：${choice.name}，请选择具体目标`;
    return;
  }
  if (choice.group === "deck") runtime.fusion.pendingDeckBuild = choice;
  const heroChoice = runtime.fusion.pendingHeroGrowth;
  const deckChoice = runtime.fusion.pendingDeckBuild;
  if (!heroChoice || !deckChoice) {
    runtime.message = choice.group === "hero"
      ? `试玩：已选 ${choice.name}，还需要选择牌组构筑`
      : `试玩：已选 ${choice.name}，还需要选择英雄成长`;
    return;
  }
  applySurvivalUpgrade(heroChoice);
  applySurvivalDeckConstructionChoice(deckChoice);
  runtime.fusion.pendingHeroGrowth = null;
  runtime.fusion.pendingDeckBuild = null;
  runtime.fusion.pendingDeckAction = null;
  runtime.upgradeChoices = [];
  runtime.message = `试玩：${heroChoice.name} + ${deckChoice.name} 已生效`;
}

function createSurvivalDeckTargetChoices(actionChoice) {
  const runtime = state.gameplayRuntime;
  const action = actionChoice.action;
  const choiceCount = activeGameplayExperiment()?.runtimeConfig?.fusionTuning?.deckTargetChoiceCount || 3;
  const deckCards = survivalDeckCards(runtime).filter((card) => card.type?.startsWith("survival_"));
  if (action === "add" || !deckCards.length) {
    return shuffleCards(survivalConstructionCardOptions()).slice(0, choiceCount).map((card) => ({
      id: `deck_add_${card.id}`,
      group: "deck",
      action: "add",
      card,
      name: `加入：${card.name}`,
      detail: `${card.detail}。进入弃牌堆，下次洗牌可抽到。`
    }));
  }
  if (action === "upgrade") {
    return shuffleCards(deckCards).slice(0, choiceCount).map((card) => ({
      id: `deck_upgrade_${card.instanceId}`,
      group: "deck",
      action: "upgrade",
      targetInstanceId: card.instanceId,
      name: `升级：${card.name}`,
      detail: `${card.detail || "提高卡牌效果"}。当前等级 ${card.level || 1}。`
    }));
  }
  if (action === "remove") {
    return shuffleCards(deckCards).slice(0, choiceCount).map((card) => ({
      id: `deck_remove_${card.instanceId}`,
      group: "deck",
      action: "remove",
      targetInstanceId: card.instanceId,
      name: `删除：${card.name}`,
      detail: `${card.detail || "从牌组移除"}。减少牌组臃肿。`
    }));
  }
  return createSurvivalDeckBuildChoices();
}

function applySurvivalUpgrade(choice) {
  const runtime = state.gameplayRuntime;
  const experiment = activeGameplayExperiment();
  if (!choice) return;
  if (runtime.mode === "wave_defense") {
    if (choice.id === "tower_damage") runtime.towers.forEach((tower) => (tower.damage *= 1.18));
    if (choice.id === "hero_damage") runtime.heroDamageMultiplier *= 1.35;
    if (choice.id === "base_repair") runtime.baseHp += 3;
    runtime.message = `试玩：已选择 ${choice.name}`;
    return;
  }
  if (experiment?.secondaryLoop === "core_loop.deck_builder" && choice.id === "cards") {
    runtime.cards = createGameplayCards();
    runtime.message = "试玩：升级，抽到一组战术牌";
    return;
  }
  if (choice.id === "damage") runtime.player.damage *= 1.22;
  if (choice.id === "range") runtime.player.attackRange += 18;
  if (choice.id === "cooldown") runtime.player.cooldownBase = Math.max(0.28, runtime.player.cooldownBase * 0.82);
  if (choice.id === "speed") runtime.player.speed *= 1.12;
  if (choice.id === "max_hp") {
    runtime.player.maxHp += 8;
      runtime.player.hp = Math.min(runtime.player.maxHp, runtime.player.hp + 12);
  }
  if (experiment?.secondaryLoop === "core_loop.deck_builder" && !isSurvivalCardDeckMode(runtime.fusion.mode)) {
    runtime.cards = createGameplayCards();
  }
  runtime.message = `试玩：已选择 ${choice.name}`;
}

function applySurvivalDeckConstructionChoice(choice) {
  const runtime = state.gameplayRuntime;
  if (!choice) return;
  if (choice.action === "add") {
    const card = choice.card ? createTunedSurvivalCardInstance(choice.card) : randomSurvivalConstructionCard();
    runtime.fusion.discardPile.push(card);
    runtime.cards = runtime.fusion.hand;
    runtime.message = `试玩：${card.name} 已加入弃牌堆`;
    return;
  }
  if (choice.action === "upgrade") {
    const card = upgradeSurvivalDeckCard(runtime, choice.targetInstanceId);
    runtime.cards = runtime.fusion.hand;
    runtime.message = `试玩：${card.name} 已升级`;
    return;
  }
  if (choice.action === "remove") {
    const removed = removeSurvivalDeckCard(runtime, choice.targetInstanceId);
    runtime.cards = runtime.fusion.hand;
    runtime.message = removed ? `试玩：已删除 ${removed.name}` : "试玩：无牌可删，已补入护体";
  }
}

function upgradeSurvivalDeckCard(runtime, targetInstanceId = null) {
  const card = survivalDeckCards(runtime).find((item) => item.instanceId === targetInstanceId) ||
    survivalDeckCards(runtime).find((item) => item.type?.startsWith("survival_"));
  if (!card) {
    const added = createSurvivalCardInstance({ id: "guard_plus", name: "护体", cost: 1, type: "survival_guard", detail: "恢复生命，提高容错", power: 1.35, level: 2 });
    added.name = "护体 II";
    runtime.fusion.discardPile.push(added);
    return added;
  }
  card.level = Math.min(5, (card.level || 1) + 1);
  card.power = Math.round(((card.power || 1) + 0.35) * 100) / 100;
  card.name = `${card.name.replace(/\s+(II|III|IV|V)$/u, "")}${survivalCardTier(card.level)}`;
  card.detail = upgradedSurvivalCardDetail(card);
  return card;
}

function removeSurvivalDeckCard(runtime, targetInstanceId = null) {
  const zones = [runtime.fusion.drawPile, runtime.fusion.discardPile, runtime.fusion.hand];
  if (targetInstanceId) {
    for (const zone of zones) {
      const index = zone.findIndex((card) => card.instanceId === targetInstanceId);
      if (index >= 0) return zone.splice(index, 1)[0];
    }
  }
  for (const zone of zones) {
    const index = zone.findIndex((card) => (card.level || 1) <= 1 && (card.cost || 0) <= 1);
    if (index >= 0) return zone.splice(index, 1)[0];
  }
  for (const zone of zones) {
    if (zone.length) return zone.splice(0, 1)[0];
  }
  runtime.fusion.discardPile.push(createSurvivalCardInstance({ id: "guard_plus", name: "护体", cost: 1, type: "survival_guard", detail: "恢复生命，提高容错", power: 1 }));
  return null;
}

function survivalCardTier(level) {
  return ["", "", " II", " III", " IV", " V"][Math.min(5, level)] || " V";
}

function upgradedSurvivalCardDetail(card) {
  const power = Math.round((card.power || 1) * 100);
  if (card.type === "survival_fury") return `8秒内伤害提高，强度 ${power}%`;
  if (card.type === "survival_sweep") return `范围伤害提高，强度 ${power}%`;
  if (card.type === "survival_snare") return `减速效果提高，强度 ${power}%`;
  if (card.type === "survival_harvest") return `经验与吸附收益提高，强度 ${power}%`;
  if (card.type === "survival_guard") return `恢复量提高，强度 ${power}%`;
  if (card.type === "survival_bounty") return `击杀收益提高，强度 ${power}%`;
  return card.detail || `强度 ${power}%`;
}

function spawnGameplayEnemy() {
  const runtime = state.gameplayRuntime;
  const start = runtime.route[0];
  runtime.waveSpawned += 1;
  const archetype = gameplayEnemyArchetype(runtime.wave, runtime.waveSpawned);
  const hp = archetype.hp * (1 + runtime.wave * 0.13) * runtime.enemyHpMultiplier * runtime.fusion.risk.hpMultiplier;
  runtime.enemies.push({
    id: nextId("enemy"),
    type: archetype.id,
    name: archetype.name,
    x: start.x,
    y: start.y,
    hp,
    maxHp: hp,
    speed: archetype.speed * (1 + runtime.wave * 0.03) * runtime.cardBonus.slow * runtime.enemySpeedMultiplier * runtime.fusion.risk.speedMultiplier,
    progress: 0,
    reward: runtime.killReward + archetype.reward
  });
  if (runtime.waveSpawned >= runtime.waveTarget) runtime.waveState = "clearing";
}

function gameplayEnemyArchetype(wave, index) {
  if (wave >= 4 && index % 7 === 0) return { id: "elite", name: "精英", hp: 28, speed: 70, reward: 3 };
  if (index % 5 === 0) return { id: "runner", name: "快兵", hp: 8, speed: 112, reward: 1 };
  if (index % 4 === 0) return { id: "heavy", name: "重甲", hp: 22, speed: 58, reward: 2 };
  return { id: "soldier", name: "步兵", hp: 12, speed: 78, reward: 0 };
}

function updateGameplayWaveState() {
  const runtime = state.gameplayRuntime;
  if (runtime.result || runtime.waveState !== "clearing" || runtime.enemies.length) return;
  if (runtime.wave >= runtime.maxWaves) {
    runtime.running = false;
    runtime.result = "victory";
    runtime.score += Math.round(runtime.baseHp * 10 + runtime.gold);
    runtime.message = `试玩：通关 ${runtime.maxWaves} 波，评分 ${runtime.score}`;
    return;
  }
  runtime.waveState = waveDefenseNeedsPlanning(activeGameplayExperiment()) ? "planning" : "break";
  runtime.running = runtime.waveState !== "planning";
  runtime.waveBreak = 2.2;
  runtime.gold += runtime.waveReward;
  if (runtime.waveState === "planning") {
    runtime.wave += 1;
    runtime.waveSpawned = 0;
    runtime.fusion.risk = { hpMultiplier: 1, speedMultiplier: 1, extraEnemies: 0, leakDamage: 0, eventLevel: 0, extraSpawn: 0 };
    runtime.fusion.pendingChoice = true;
    runtime.cards = createWavePlanningCards(runtime, activeGameplayExperiment());
    runtime.waveTarget = gameplayWaveTarget(runtime.wave, activeGameplayExperiment());
    runtime.message = `试玩：进入第 ${runtime.wave} 波，先选择关系卡`;
  } else {
    runtime.message = `试玩：第 ${runtime.wave} 波守住，奖励金币 ${runtime.waveReward}`;
  }
}

function startNextGameplayWave() {
  const runtime = state.gameplayRuntime;
  runtime.wave += 1;
  runtime.waveSpawned = 0;
  runtime.waveTarget = gameplayWaveTarget(runtime.wave, activeGameplayExperiment()) + runtime.fusion.risk.extraEnemies;
  runtime.waveState = "spawning";
  runtime.running = true;
  runtime.spawnTimer = 0.35;
  if (runtime.fusion.mode === "build_cards") addWaveBuildReinforcementCards(runtime);
  runtime.message = `试玩：第 ${runtime.wave} 波开始`;
}

function addWaveBuildReinforcementCards(runtime) {
  const cards = createWaveBuildCards(runtime.wave).map((card, index) => ({
    ...card,
    instanceId: `${card.id}-${runtime.wave}-reinforce-${index}-${Math.random().toString(36).slice(2, 5)}`
  }));
  runtime.fusion.discardPile.push(...cards);
  drawWaveBuildCards(runtime, Math.max(0, 3 - runtime.fusion.hand.length));
}

function waveDefenseNeedsPlanning(experiment) {
  return experiment?.primaryLoop === "core_loop.wave_defense" &&
    experiment?.secondaryLoop === "core_loop.deck_builder" &&
    ["wave_tactic_cards", "risk_contract"].includes(experiment?.fusionTemplate);
}

function createWavePlanningCards(runtime, experiment) {
  if (experiment?.fusionTemplate === "risk_contract") return createWaveRiskContracts(runtime.wave);
  return createWaveTacticCards(runtime.wave);
}

function updateGameplayEnemies(delta) {
  const runtime = state.gameplayRuntime;
  runtime.enemies.forEach((enemy) => {
    if (enemy.behavior === "hunter") {
      moveGameplayHunterEnemy(enemy, delta);
      return;
    }
    if (enemy.behavior === "side_base") {
      moveGameplaySideBaseEnemy(enemy, delta);
      return;
    }
    if (resolveHeroEnemyDuel(enemy, delta)) return;
    enemy.progress += (enemy.speed * delta) / gameplayRouteLength(runtime.route);
    const point = pointOnRoute(runtime.route, enemy.progress);
    if (point) {
      enemy.x = point.x;
      enemy.y = point.y;
    }
  });
  runtime.enemies = runtime.enemies.filter((enemy) => {
    if (enemy.hp <= 0) {
      runtime.gold += enemy.reward;
      runtime.kills += 1;
      runtime.score += Math.round(10 + enemy.reward * 3);
      if (runtime.fusion.mode === "hero_growth_defense") runtime.exp += runtime.expPerKill;
      if (runtime.fusion.mode === "hero_growth_defense" && canTriggerHeroGrowth(runtime)) {
        runtime.exp = 0;
        runtime.fusion.heroGrowthWave = runtime.wave;
        runtime.fusion.heroGrowthThreshold += 4;
        runtime.upgradeChoices = createSurvivalUpgradeChoices("wave_defense");
        runtime.message = "试玩：英雄成长，选择一个防守升级";
      }
      return false;
    }
    if (enemy.behavior === "side_base" && enemy.reachedBase) {
      runtime.baseHp = Math.max(0, runtime.baseHp - 2);
      const base = runtime.route[runtime.route.length - 1];
      spawnDamageVfx(base, 2, { color: "#f97316", text: "基地-2" });
      return false;
    }
    if (enemy.progress >= 1) {
      const leakDamage = 1 + runtime.fusion.risk.leakDamage;
      runtime.baseHp = Math.max(0, runtime.baseHp - leakDamage);
      const base = runtime.route[runtime.route.length - 1];
      spawnDamageVfx(base, leakDamage, { color: "#f97316", text: `基地-${leakDamage}` });
      return false;
    }
    return true;
  });
}

function canTriggerHeroGrowth(runtime) {
  if (runtime.upgradeChoices.length) return false;
  if (runtime.fusion.heroGrowthWave === runtime.wave) return false;
  return runtime.exp >= (runtime.fusion.heroGrowthThreshold || 8);
}

function moveGameplayHunterEnemy(enemy, delta) {
  const runtime = state.gameplayRuntime;
  if (resolveHeroEnemyDuel(enemy, delta)) return;
  const target = runtime.hero.defeatedTimer > 0 ? runtime.route[runtime.route.length - 1] : runtime.hero;
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  enemy.x += (dx / length) * enemy.speed * delta;
  enemy.y += (dy / length) * enemy.speed * delta;
}

function moveGameplaySideBaseEnemy(enemy, delta) {
  const runtime = state.gameplayRuntime;
  if (resolveHeroEnemyDuel(enemy, delta)) return;
  const base = runtime.route[runtime.route.length - 1];
  const dx = base.x - enemy.x;
  const dy = base.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  enemy.x += (dx / length) * enemy.speed * delta;
  enemy.y += (dy / length) * enemy.speed * delta;
  enemy.progress = Math.max(enemy.progress || 0, 1 - Math.min(1, distance(enemy, base) / MAP_HEIGHT));
  if (distance(enemy, base) < 32) enemy.reachedBase = true;
}

function resolveHeroEnemyDuel(enemy, delta) {
  const runtime = state.gameplayRuntime;
  if (!runtime.heroEnabled || runtime.hero.hp <= 0 || runtime.hero.defeatedTimer > 0) return false;
  const contactRange = runtime.hero.mode === "free" ? 28 : 34;
  if (distance(enemy, runtime.hero) > contactRange) return false;
  enemy.hp -= 7 * runtime.heroDamageMultiplier * delta;
  runtime.hero.hp = Math.max(0, runtime.hero.hp - (3.5 + runtime.wave * 0.35) * delta);
  runtime.hero.cooldown = Math.max(runtime.hero.cooldown, 0.2);
  if (runtime.hero.hp <= 0) {
    runtime.hero.defeatedTimer = runtime.hero.mode === "free" ? 5 : 8;
    runtime.message = "试玩：英雄被击退，暂时无法拦截敌人";
  }
  return true;
}

function updateGameplayTowers(delta) {
  const runtime = state.gameplayRuntime;
  runtime.towers.forEach((tower) => {
    tower.cooldown = Math.max(0, tower.cooldown - delta);
    if (tower.cooldown > 0) return;
    const target = runtime.enemies.filter((enemy) => distance(enemy, tower) <= tower.range).sort((a, b) => b.progress - a.progress)[0];
    if (!target) return;
    tower.cooldown = tower.fireRate;
    runtime.projectiles.push({ x: tower.x, y: tower.y, targetId: target.id, damage: tower.damage * runtime.cardBonus.damage, life: 0.6 });
  });
}

function updateGameplayProjectiles(delta) {
  const runtime = state.gameplayRuntime;
  runtime.projectiles.forEach((projectile) => {
    const target = runtime.enemies.find((enemy) => enemy.id === projectile.targetId);
    if (!target) {
      projectile.life = 0;
      return;
    }
    projectile.x += (target.x - projectile.x) * Math.min(1, delta * 12);
    projectile.y += (target.y - projectile.y) * Math.min(1, delta * 12);
    projectile.life -= delta;
    if (distance(projectile, target) < 14 || projectile.life <= 0) {
      target.hp -= projectile.damage;
      if (projectile.damage > 0) spawnDamageVfx(target, projectile.damage, { color: "#f59e0b", size: 13 });
      projectile.life = 0;
    }
  });
  runtime.projectiles = runtime.projectiles.filter((projectile) => projectile.life > 0);
}

function gameplayRouteLength(route) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i += 1) total += distance(route[i], route[i + 1]);
  return total || 1;
}

function closestRouteProgress(route, point) {
  const total = gameplayRouteLength(route);
  let traversed = 0;
  let best = { distance: Infinity, progress: 0 };
  for (let i = 0; i < route.length - 1; i += 1) {
    const a = route[i];
    const b = route[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy || 1;
    const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1);
    const projected = { x: a.x + dx * t, y: a.y + dy * t };
    const segmentLength = distance(a, b);
    const currentDistance = distance(point, projected);
    if (currentDistance < best.distance) {
      best = { distance: currentDistance, progress: (traversed + segmentLength * t) / total };
    }
    traversed += segmentLength;
  }
  return clamp(best.progress, 0, 1);
}

function handleGameplayCanvasClick(event) {
  if (!state.gameplaySkeleton) return;
  const point = canvasPoint(event, previewCanvas);
  const x = point.x * (MAP_WIDTH / previewCanvas.width);
  const y = point.y * (MAP_HEIGHT / previewCanvas.height);
  if (handleTowerMenuClick(x, y)) {
    renderGameplayEditor();
    return;
  }
  if (handleRuntimeUpgradeChoiceClick(x, y)) {
    renderGameplayEditor();
    return;
  }
  if (state.gameplayRuntime.mode === "survival_growth") {
    handleSurvivalCanvasClick(x, y);
    return;
  }
  if (state.gameplayRuntime.mode === "deck_builder") {
    handleDeckBuilderCanvasClick(x, y);
    return;
  }
  if (state.gameplayRuntime.mode === "unsupported") return;
  const runtime = state.gameplayRuntime;
  const cardIndex = gameplayBottomCardIndexAt(runtime.cards, x, y);
  if (cardIndex >= 0) {
    handleWaveDefenseCardClick(cardIndex);
    renderGameplayEditor();
    return;
  }
  const tower = runtime.towers.find((item) => distance(item, { x, y }) < 32);
  if (tower) {
    if (runtime.fusion.mode === "build_cards") {
      applyBuildCardToTower(tower);
      renderGameplayEditor();
      return;
    }
    openTowerUpgradeMenu(tower);
    renderGameplayEditor();
    return;
  }
  if (runtime.mode !== "wave_defense") return;
  const effectiveBuildCost = currentGameplayBuildCost(runtime);
  const pointSlot = runtime.buildPoints.find((item) => !item.occupied && distance(item, { x, y }) < 42);
  if (!pointSlot) {
    if (runtime.fusion.mode === "build_cards") {
      runtime.message = "试玩：先选建造牌再点绿色空位，或选升级/强化牌再点已有塔";
      renderGameplayEditor();
    }
    return;
  }
  if (runtime.fusion.mode === "build_cards") {
    applyBuildCardToPoint(pointSlot);
    renderGameplayEditor();
    return;
  }
  openTowerBuildMenu(pointSlot);
  renderGameplayEditor();
}

function handleTowerMenuClick(x, y) {
  const runtime = state.gameplayRuntime;
  const menu = runtime.towerMenu;
  if (!menu) return false;
  const index = menu.options.findIndex((_, optionIndex) => y > 516 && y < 704 && x > 76 + optionIndex * 210 && x < 262 + optionIndex * 210);
  if (index < 0) {
    runtime.towerMenu = null;
    runtime.message = "试玩：已关闭塔操作菜单";
    return true;
  }
  const option = menu.options[index];
  if (menu.type === "build") applyTowerBuildOption(menu.point, option);
  if (menu.type === "upgrade") applyTowerUpgradeOption(menu.tower, option);
  runtime.towerMenu = null;
  return true;
}

function openTowerBuildMenu(pointSlot) {
  const runtime = state.gameplayRuntime;
  runtime.towerMenu = {
    type: "build",
    point: pointSlot,
    title: "选择建造塔",
    subtitle: "不同塔承担不同防守职责，费用从当前金币扣除。",
    options: gameplayTowerCatalog().map((tower) => ({
      id: tower.id,
      name: tower.name,
      cost: Math.max(1, Math.round(tower.cost || tower.upgradeCost * 0.8)),
      detail: tower.role,
      towerType: tower.id
    }))
  };
  runtime.message = "试玩：选择一种防御塔建造";
}

function openTowerUpgradeMenu(tower) {
  const runtime = state.gameplayRuntime;
  runtime.towerMenu = {
    type: "upgrade",
    tower,
    title: `${tower.name} Lv.${tower.level}`,
    subtitle: "选择升级方向：等级、射程或攻速。",
    options: createTowerUpgradeOptions(tower)
  };
  runtime.message = `试玩：选择 ${tower.name} 的升级策略`;
}

function handleWaveDefenseCardClick(cardIndex) {
  const runtime = state.gameplayRuntime;
  const card = runtime.cards[cardIndex];
  if (!card) return;
  if (runtime.fusion.mode === "wave_tactic_cards") {
    applyWaveTacticCard(card);
    runtime.cards = [];
    return;
  }
  if (runtime.fusion.mode === "risk_contract") {
    applyWaveRiskContract(card);
    runtime.cards = [];
    return;
  }
  if (runtime.fusion.mode === "build_cards") {
    if (["build_gold", "build_discount"].includes(card.type)) {
      applyBuildInstantCard(card);
      discardWaveBuildCard(runtime, card);
      return;
    }
    runtime.fusion.buildSelection = card;
    runtime.message = card.type === "build_tower"
      ? `试玩：已选择${card.name}，点击空位建造`
      : `试玩：已选择${card.name}，点击已有塔生效`;
    return;
  }
  applyGameplayCard(card);
  runtime.cards.splice(cardIndex, 1);
}

function applyBuildCardToPoint(pointSlot) {
  const runtime = state.gameplayRuntime;
  const card = runtime.fusion.buildSelection;
  if (!card || card.type !== "build_tower") {
    runtime.message = "试玩：先选择一张建造牌";
    return;
  }
  const cost = currentBuildCardCost(card);
  if (runtime.gold < cost) {
    runtime.message = `试玩：金币不足，${card.name} 需要 ${cost}`;
    return;
  }
  pointSlot.occupied = true;
  runtime.gold -= cost;
  runtime.buildDiscount = 0;
  const tower = createGameplayTower(pointSlot, runtime.towers.length, card.towerType);
  runtime.towers.push(tower);
  spawnFloatVfx(pointSlot.x, pointSlot.y - 40, card.name, "#2563eb");
  spawnPulseVfx(pointSlot.x, pointSlot.y, "#2563eb", { radius: 42 });
  runtime.fusion.buildSelection = null;
  discardWaveBuildCard(runtime, card);
  runtime.message = `试玩：${card.name} 已建造`;
}

function applyBuildCardToTower(tower) {
  const runtime = state.gameplayRuntime;
  const card = runtime.fusion.buildSelection;
  if (!card || !["build_upgrade", "build_buff"].includes(card.type)) {
    runtime.message = "试玩：先选择升级或强化牌，或点击空位使用建造牌";
    return;
  }
  if (card.type === "build_buff") {
    const cost = currentBuildCardCost(card);
    if (runtime.gold < cost) {
      runtime.message = `试玩：金币不足，${card.name} 需要 ${cost}`;
      return;
    }
    runtime.gold -= cost;
    runtime.buildDiscount = 0;
    if (card.buff === "range") tower.range += 28;
    if (card.buff === "rapid") tower.fireRate = Math.max(0.32, tower.fireRate * 0.78);
    spawnFloatVfx(tower.x, tower.y - 42, card.name, "#2563eb");
    spawnPulseVfx(tower.x, tower.y, "#2563eb", { radius: 42 });
    runtime.fusion.buildSelection = null;
    discardWaveBuildCard(runtime, card);
    runtime.message = `试玩：${card.name} 已强化 ${tower.name}`;
    return;
  }
  const originalCost = tower.upgradeCost;
  tower.upgradeCost = Math.max(1, Math.round(currentBuildCardCost(card) / Math.max(1, tower.level)));
  upgradeGameplayTower(tower);
  tower.upgradeCost = originalCost;
  spawnFloatVfx(tower.x, tower.y - 42, card.name, "#2563eb");
  spawnPulseVfx(tower.x, tower.y, "#2563eb", { radius: 42 });
  runtime.fusion.buildSelection = null;
  runtime.buildDiscount = 0;
  discardWaveBuildCard(runtime, card);
}

function currentBuildCardCost(card) {
  return Math.max(0, (card.cost || 0) - state.gameplayRuntime.buildDiscount);
}

function applyBuildInstantCard(card) {
  const runtime = state.gameplayRuntime;
  if (card.type === "build_gold") runtime.gold += card.value;
  if (card.type === "build_discount") runtime.buildDiscount += card.value;
  const base = runtime.route[runtime.route.length - 1] || { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
  spawnFloatVfx(base.x, base.y - 52, card.type === "build_gold" ? `金币+${card.value}` : `费用-${card.value}`, "#facc15");
  runtime.fusion.buildSelection = null;
  runtime.message = `试玩：${card.name} 已生效`;
}

function handleSurvivalCanvasClick(x, y) {
  const runtime = state.gameplayRuntime;
  if (handleRuntimeUpgradeChoiceClick(x, y)) return;
  const cardIndex = gameplayBottomCardIndexAt(runtime.cards, x, y);
  if (cardIndex < 0) {
    if (handleSurvivalTowerFusionClick(x, y)) renderGameplayEditor();
    return;
  }
  if (isSurvivalTowerSkillMode(runtime.fusion.mode)) {
    playSurvivalTowerSkillCard(cardIndex);
    renderGameplayEditor();
    return;
  }
  if (isSurvivalCardDeckMode(runtime.fusion.mode)) {
    playSurvivalFusionCard(cardIndex);
  } else {
    const card = runtime.cards[cardIndex];
    applyGameplayCard(card);
    if (runtime.fusion.mode !== "risk_contract" && runtime.fusion.mode !== "risk_event_cards") runtime.cards.splice(cardIndex, 1);
  }
  renderGameplayEditor();
}

function handleSurvivalTowerFusionClick(x, y) {
  const runtime = state.gameplayRuntime;
  if (!isSurvivalTowerFusionMode(runtime.fusion.mode)) return false;
  if (runtime.fusion.mode === "survival_base_zone" && runtime.fusion.base && distance(runtime.fusion.base, { x, y }) < 52) {
    upgradeSurvivalBaseZone();
    return true;
  }
  if (runtime.fusion.mode !== "portable_turret_ring") return false;
  const playerDistance = distance(runtime.player, { x, y });
  if (playerDistance > 175) {
    runtime.message = "试玩：临时炮台只能部署在角色附近";
    return true;
  }
  deploySurvivalTurret(x, y, {
    duration: runtime.fusion.turretDuration || 18,
    cost: runtime.fusion.deployCost || 4,
    message: "试玩：已部署临时炮台，形成安全圈"
  });
  return true;
}

function upgradeSurvivalBaseZone() {
  const runtime = state.gameplayRuntime;
  const base = runtime.fusion.base;
  if (!base) return;
  const cost = Math.max(2, Math.round((runtime.fusion.deployCost || 4) + base.level));
  if ((runtime.fusion.parts || 0) < cost) {
    runtime.message = `试玩：零件不足，据点修复/升级需要 ${cost}`;
    return;
  }
  runtime.fusion.parts -= cost;
  base.level += 1;
  base.maxHp += 8;
  const beforeHp = base.hp;
  base.hp = Math.min(base.maxHp, base.hp + 18);
  base.damage *= 1.16;
  base.range += 10;
  spawnHealVfx(base, base.hp - beforeHp, { color: "#22c55e", text: `据点Lv.${base.level}` });
  runtime.message = `试玩：据点升到 Lv.${base.level}，火力和耐久提高`;
}

function deploySurvivalTurret(x, y, options = {}) {
  const runtime = state.gameplayRuntime;
  const cost = options.cost ?? runtime.fusion.deployCost ?? 4;
  if ((runtime.fusion.parts || 0) < cost) {
    runtime.message = `试玩：零件不足，部署需要 ${cost}`;
    return false;
  }
  runtime.fusion.parts -= cost;
  runtime.fusion.turrets.push({
    id: nextId("surv-turret"),
    x: clamp(x, 40, MAP_WIDTH - 40),
    y: clamp(y, 160, MAP_HEIGHT - 70),
    range: 150,
    damage: runtime.fusion.turretDamage || 4,
    fireRate: 0.72,
    cooldown: 0,
    remaining: options.duration || runtime.fusion.turretDuration || 12
  });
  spawnFloatVfx(x, y - 42, "部署炮台", "#2563eb");
  spawnPulseVfx(x, y, "#2563eb", { radius: 52 });
  runtime.message = options.message || "试玩：已部署炮台";
  return true;
}

function playSurvivalTowerSkillCard(index) {
  const runtime = state.gameplayRuntime;
  const card = runtime.cards[index];
  if (!card) return;
  if ((runtime.fusion.skillCharges || 0) < card.cost) {
    runtime.message = `试玩：防线充能不足，${card.name} 需要 ${card.cost}`;
    return;
  }
  runtime.fusion.skillCharges -= card.cost;
  const player = runtime.player;
  if (card.type === "tower_skill_barrage") {
    runtime.enemies.forEach((enemy) => {
      if (distance(enemy, player) <= player.attackRange + 120) {
        enemy.hp -= card.value;
        spawnDamageVfx(enemy, card.value, { color: "#f59e0b", size: 13 });
      }
    });
    spawnPulseVfx(player.x, player.y, "#f59e0b", { radius: player.attackRange + 120, life: 0.45 });
  }
  if (card.type === "tower_skill_barricade") {
    runtime.fusion.barricades.push({ x: player.x, y: player.y, radius: 145, remaining: card.value || 8 });
    spawnFloatVfx(player.x, player.y - 52, "路障减速", "#14b8a6");
    spawnPulseVfx(player.x, player.y, "#14b8a6", { radius: 145, life: 0.45 });
  }
  if (card.type === "tower_skill_watchtower") {
    runtime.fusion.parts += card.cost;
    deploySurvivalTurret(player.x + 76, player.y, { duration: card.value || 12, cost: card.cost, message: "试玩：临时塔阵已召唤" });
  }
  runtime.message = `试玩：释放${card.name}`;
}

function handleDeckBuilderCanvasClick(x, y) {
  const runtime = state.gameplayRuntime;
  const rewardIndex = runtime.deck.rewardChoices.findIndex((_, index) => y > 596 && y < 744 && x > 88 + index * 202 && x < 260 + index * 202);
  if (rewardIndex >= 0) {
    chooseDeckReward(rewardIndex);
    renderGameplayEditor();
    return;
  }
  if (handleDeckActionButtonClick(x, y)) {
    renderGameplayEditor();
    return;
  }
  const cardIndex = gameplayBottomCardIndexAt(runtime.deck.hand, x, y, { height: 150, bottom: 58, minWidth: 150, maxWidth: 184, gap: 14 });
  if (cardIndex < 0) return;
  if (runtime.deck.discardMode) {
    discardDeckBuilderCard(cardIndex);
    renderGameplayEditor();
    return;
  }
  playDeckBuilderCard(cardIndex);
  renderGameplayEditor();
}

function deckActionButtonRects() {
  return [
    { id: "end_turn", label: "结束回合", x: 76, y: 642, width: 156, height: 52 },
    { id: "discard", label: "弃牌", x: 246, y: 642, width: 156, height: 52 },
    { id: "forfeit", label: "认输", x: 416, y: 642, width: 132, height: 52 }
  ];
}

function handleDeckActionButtonClick(x, y) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  if (deck.status !== "playing" || runtime.result) return false;
  const button = deckActionButtonRects().find((item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height);
  if (!button) return false;
  if (button.id === "end_turn") {
    endDeckBuilderTurn("玩家结束回合");
  }
  if (button.id === "discard") {
    deck.discardMode = !deck.discardMode;
    runtime.message = deck.discardMode
      ? (deck.discardUsedThisTurn ? "试玩：选择一张手牌弃掉" : "试玩：选择一张手牌弃掉，本回合第一次弃牌 +1 能量")
      : "试玩：取消弃牌";
  }
  if (button.id === "forfeit") {
    deck.status = "defeat";
    runtime.running = false;
    runtime.result = "defeat";
    runtime.message = "试玩：本局已认输，点击试玩重新开始";
  }
  return true;
}

function endDeckBuilderTurn(reason = "结束回合") {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  if (deck.status !== "playing" || runtime.result) return;
  deck.discardMode = false;
  runtime.message = `试玩：${reason}`;
  resolveDeckBuilderEnemyTurn();
}

function discardDeckBuilderCard(index) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  if (deck.status !== "playing") return;
  const card = deck.hand[index];
  if (!card) return;
  deck.hand.splice(index, 1);
  deck.discardPile.push(card);
  let energyGain = 0;
  if (!deck.discardUsedThisTurn) {
    deck.energy += 1;
    deck.discardUsedThisTurn = true;
    energyGain = 1;
  }
  deck.discardMode = false;
  runtime.cards = deck.hand;
  spawnFloatVfx(deckPlayerVfxPoint().x, deckPlayerVfxPoint().y - 44, energyGain ? "弃牌 +1能量" : "弃牌", energyGain ? "#facc15" : "#94a3b8");
  runtime.message = energyGain
    ? `试玩：弃掉${card.name}，获得 1 点能量`
    : `试玩：弃掉${card.name}`;
  if (!deck.hand.length) resolveDeckBuilderEnemyTurn();
}

function applyGameplayCard(card) {
  const runtime = state.gameplayRuntime;
  if (runtime.mode === "survival_growth" && String(card.type).startsWith("survival_")) {
    applySurvivalFusionCard(card);
    return;
  }
  if (runtime.mode === "survival_growth" && String(card.type).startsWith("risk_")) {
    applySurvivalRiskContract(card);
    return;
  }
  if (card.type === "damage") runtime.cardBonus.damage *= 1.25;
  if (card.type === "gold") runtime.gold += 18;
  if (card.type === "slow") runtime.cardBonus.slow *= 0.8;
  if (card.type === "discount") runtime.buildDiscount += 5;
  if (card.type === "reward") runtime.killReward += 1;
  if (card.type === "range") {
    if (runtime.mode === "survival_growth") runtime.player.attackRange *= 1.2;
    else runtime.towers.forEach((tower) => (tower.range *= 1.2));
  }
  if (card.type === "rapid") {
    if (runtime.mode === "survival_growth") runtime.player.damage *= 1.12;
    else runtime.towers.forEach((tower) => (tower.fireRate *= 0.8));
  }
  if (card.type === "weaken") runtime.enemies.forEach((enemy) => {
    enemy.hp *= 0.8;
    enemy.maxHp *= 0.8;
  });
  if (card.type === "delay") runtime.spawnIntervalBase *= 1.25;
  if (card.type === "hero_damage") runtime.heroDamageMultiplier *= 1.4;
  if (card.type === "hero_core") {
    runtime.heroEnabled = true;
    runtime.heroDamageMultiplier *= 1.25;
  }
  if (card.type === "survival_guard" && runtime.player) {
    runtime.player.hp = Math.min(runtime.player.maxHp, runtime.player.hp + 10);
  }
  runtime.message = `试玩：${card.name} 已生效`;
}

function applySurvivalRiskContract(card) {
  const runtime = state.gameplayRuntime;
  const rewardScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.cardRewardScale || 1;
  const riskScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.riskPenaltyScale || 1;
  runtime.fusion.risk.eventLevel = (runtime.fusion.risk.eventLevel || 0) + 1;
  if (card.type === "risk_gold") {
    runtime.killReward += Math.max(1, Math.round(rewardScale));
    runtime.score += Math.round(30 * rewardScale);
    runtime.fusion.risk.extraSpawn += Math.max(1, Math.round(riskScale));
    runtime.spawnIntervalBase = Math.max(0.22, runtime.spawnIntervalBase * Math.max(0.62, 1 - 0.16 * riskScale));
    spawnFloatVfx(runtime.player.x, runtime.player.y - 52, "赏金+ 风险+", "#f97316");
  }
  if (card.type === "risk_exp") {
    gainSurvivalExp(runtime, 4 * rewardScale);
    runtime.enemyHpMultiplier *= 1 + 0.16 * riskScale;
    spawnFloatVfx(runtime.player.x, runtime.player.y - 52, `经验+${Math.round(4 * rewardScale)}`, "#38bdf8");
  }
  if (card.type === "risk_score") {
    runtime.score += Math.round(80 * rewardScale);
    const speedScale = 1 + 0.12 * riskScale;
    runtime.enemySpeedMultiplier *= speedScale;
    runtime.enemies.forEach((enemy) => {
      enemy.baseSpeed = (enemy.baseSpeed || enemy.speed) * speedScale;
      enemy.speed = enemy.baseSpeed;
    });
    spawnFloatVfx(runtime.player.x, runtime.player.y - 52, "得分+ 敌速+", "#f97316");
  }
  if (card.type === "risk_card") {
    const added = createTunedSurvivalCardInstance({
      id: "risk_drawn_skill",
      name: "禁术",
      cost: 1,
      type: "survival_sweep",
      detail: "高强度范围清场",
      power: 1.25 * rewardScale
    });
    runtime.fusion.discardPile.push(added);
    runtime.spawnIntervalBase = Math.max(0.22, runtime.spawnIntervalBase * Math.max(0.62, 1 - 0.12 * riskScale));
    spawnFloatVfx(runtime.player.x, runtime.player.y - 52, "禁术入牌组", "#a855f7");
  }
  if (card.type === "risk_heal") {
    const beforeHp = runtime.player.hp;
    runtime.player.hp = Math.min(runtime.player.maxHp, runtime.player.hp + 12 * rewardScale);
    runtime.fusion.risk.extraSpawn += Math.max(1, Math.round(riskScale));
    spawnHealVfx(runtime.player, runtime.player.hp - beforeHp, { color: "#22c55e" });
  }
  runtime.cards = createSurvivalRiskContracts();
  runtime.message = `试玩：${card.name} 生效，风险层数 ${runtime.fusion.risk.eventLevel}`;
}

function playSurvivalFusionCard(index) {
  const runtime = state.gameplayRuntime;
  const card = runtime.fusion.hand[index];
  if (!card) return;
  if (runtime.fusion.energy < card.cost) {
    runtime.message = `试玩：能量不足，${card.name} 需要 ${card.cost}`;
    return;
  }
  runtime.fusion.energy -= card.cost;
  runtime.fusion.hand.splice(index, 1);
  runtime.fusion.discardPile.push(card);
  applySurvivalFusionCard(card);
  runtime.cards = runtime.fusion.hand;
}

function applySurvivalFusionCard(card) {
  const runtime = state.gameplayRuntime;
  const player = runtime.player;
  const power = card.power || 1;
  if (card.type === "survival_fury") {
    const multiplier = 1 + 0.45 * power;
    player.damage *= multiplier;
    runtime.fusion.activeEffects.push({ id: "fury", remaining: 8, multiplier });
    spawnFloatVfx(player.x, player.y - 52, "伤害提升", "#f59e0b");
    spawnPulseVfx(player.x, player.y, "#f59e0b", { radius: player.attackRange * 0.35 });
  }
  if (card.type === "survival_sweep") {
    runtime.enemies.forEach((enemy) => {
      if (distance(enemy, player) <= player.attackRange + 64) {
        const damage = player.damage * 3.2 * power;
        enemy.hp -= damage;
        spawnDamageVfx(enemy, damage, { color: "#f59e0b", size: 13 });
      }
    });
    spawnPulseVfx(player.x, player.y, "#f59e0b", { radius: player.attackRange + 64, life: 0.45 });
  }
  if (card.type === "survival_snare") {
    const multiplier = Math.max(0.45, 0.75 - (power - 1) * 0.16);
    runtime.cardBonus.slow *= multiplier;
    runtime.fusion.activeEffects.push({ id: "snare", remaining: 8, multiplier });
    spawnFloatVfx(player.x, player.y - 52, "敌速降低", "#14b8a6");
    spawnPulseVfx(player.x, player.y, "#14b8a6", { radius: player.attackRange + 80, life: 0.45 });
  }
  if (card.type === "survival_harvest") {
    gainSurvivalExp(runtime, 2 * power);
    runtime.orbs.forEach((orb) => {
      orb.x = player.x;
      orb.y = player.y;
    });
    spawnFloatVfx(player.x, player.y - 52, `经验+${Math.round(2 * power)}`, "#38bdf8");
  }
  if (card.type === "survival_guard") {
    const beforeHp = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + 12 * power);
    spawnHealVfx(player, player.hp - beforeHp, { color: "#22c55e" });
  }
  if (card.type === "survival_bounty") {
    runtime.killReward += Math.max(1, Math.round(power));
    runtime.score += Math.round(25 * power);
    spawnFloatVfx(player.x, player.y - 52, "赏金提升", "#facc15");
  }
  runtime.message = `试玩：释放${card.name}`;
}

function currentGameplayBuildCost(runtime) {
  return Math.max(1, runtime.buildCost - runtime.buildDiscount);
}

function upgradeGameplayTower(tower) {
  const runtime = state.gameplayRuntime;
  if (tower.level >= tower.maxLevel) {
    runtime.message = `试玩：${tower.name} 已满级`;
    return;
  }
  const cost = Math.round(tower.upgradeCost * tower.level);
  if (runtime.gold < cost) {
    runtime.message = `试玩：金币不足，${tower.name} 升级需要 ${cost}`;
    return;
  }
  runtime.gold -= cost;
  tower.level += 1;
  tower.damage = Math.round(tower.damage * 1.42);
  tower.range += 18;
  tower.fireRate = Math.max(0.35, tower.fireRate * 0.92);
  runtime.message = `试玩：${tower.name} 升到 Lv.${tower.level}`;
}

function createDeckBuilderDeck(experiment) {
  const intensity = experiment?.runtimeConfig?.fusionIntensity || 1;
  const deck = [
    { id: "strike", name: "突击", cost: 1, type: "attack", value: Math.round(7 * intensity) },
    { id: "strike", name: "突击", cost: 1, type: "attack", value: Math.round(7 * intensity) },
    { id: "strike", name: "突击", cost: 1, type: "attack", value: Math.round(7 * intensity) },
    { id: "guard", name: "布防", cost: 1, type: "block", value: 6 },
    { id: "guard", name: "布防", cost: 1, type: "block", value: 6 },
    { id: "rally", name: "集结", cost: 1, type: "energy", value: 1 },
    { id: "combo", name: "连携", cost: 2, type: "attack", value: Math.round(14 * intensity) },
    { id: "scheme", name: "谋略", cost: 1, type: "draw", value: 2 }
  ];
  deck.push(...createDeckBuilderFusionDeckCards(experiment));
  if (experiment?.runtimeConfig?.goalCardBonus) deck.push({ id: "focus", name: "抉择", cost: 0, type: "energy", value: 1 });
  return deck.map((card, index) => ({ ...card, instanceId: `${card.id}-${index}-${Math.random().toString(36).slice(2, 5)}` }));
}

function createDeckBuilderFusionDeckCards(experiment) {
  const rewardScale = experiment?.runtimeConfig?.tuningScales?.cardRewardScale || 1;
  const buildScale = experiment?.runtimeConfig?.tuningScales?.constructionCost || 1;
  const intensity = experiment?.runtimeConfig?.fusionIntensity || 1;
  if (experiment?.secondaryLoop === "core_loop.wave_defense") {
    return [
      { id: "lane_arrow", name: "建箭楼", cost: Math.max(1, Math.round(1 * buildScale)), type: "lane_tower", value: Math.round(5 * rewardScale), detail: "加入一座防线塔，每回合自动输出" },
      { id: "lane_wall", name: "修城墙", cost: Math.max(1, Math.round(1 * buildScale)), type: "lane_wall", value: Math.round(7 * rewardScale), detail: "恢复基地并获得格挡" },
      { id: "lane_upgrade", name: "军械升级", cost: Math.max(1, Math.round(2 * buildScale)), type: "lane_upgrade", value: Math.max(1, 0.25 * rewardScale), detail: "强化所有防线塔" }
    ];
  }
  if (experiment?.secondaryLoop === "core_loop.survival_growth") {
    if (experiment.fusionTemplate === "survival_turn_cards") {
      return [
        { id: "surv_dodge", name: "翻滚", cost: 1, type: "survival_dodge", value: Math.round(8 * rewardScale), detail: "格挡并降低本回合包围压力" },
        { id: "surv_cleave", name: "旋斩", cost: 2, type: "survival_burst", value: Math.round(16 * intensity * rewardScale), detail: "清理敌群，降低压力" },
        { id: "surv_heal", name: "喘息", cost: 1, type: "survival_heal", value: Math.round(6 * rewardScale), detail: "恢复生命" }
      ];
    }
    return [
      { id: "summon_guard", name: "召唤护卫", cost: 1, type: "summon_unit", value: Math.round(5 * rewardScale), detail: "召唤伙伴，持续攻击并吸收伤害" },
      { id: "command_pack", name: "集火指令", cost: 1, type: "summon_command", value: Math.round(9 * rewardScale), detail: "所有伙伴立刻攻击" },
      { id: "pack_growth", name: "伙伴成长", cost: 2, type: "summon_upgrade", value: Math.max(1, 0.35 * rewardScale), detail: "提高伙伴伤害和持续时间" }
    ];
  }
  return [];
}

function shuffleCards(cards) {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function drawDeckCards(deck, count) {
  for (let i = 0; i < count; i += 1) {
    if (!deck.drawPile.length && deck.discardPile.length) {
      deck.drawPile = shuffleCards(deck.discardPile);
      deck.discardPile = [];
    }
    if (!deck.drawPile.length) return;
    deck.hand.push(deck.drawPile.pop());
  }
}

function createDeckEnemyIntent(turn, pressureMultiplier = 1) {
  if (turn % 4 === 0) return { type: "attack", value: Math.round((16 + turn) * pressureMultiplier), label: "重击" };
  if (turn % 3 === 0) return { type: "buff", value: 5, label: "蓄力" };
  return { type: "attack", value: Math.round((8 + turn * 1.4) * pressureMultiplier), label: "攻击" };
}

function createDeckRewardChoices(experiment) {
  const intensity = experiment?.runtimeConfig?.fusionIntensity || 1;
  return shuffleCards([
    { id: "cleave", name: "横扫", cost: 2, type: "attack", value: Math.round(18 * intensity) },
    { id: "fortify", name: "固守", cost: 1, type: "block", value: 11 },
    { id: "insight", name: "洞察", cost: 0, type: "draw", value: 2 },
    { id: "momentum", name: "乘胜", cost: 0, type: "energy", value: 2 },
    { id: "finisher", name: "斩将", cost: 3, type: "attack", value: Math.round(28 * intensity) }
  ]).slice(0, 3);
}

function createDeckFusionRewardChoices(experiment) {
  const count = experiment?.runtimeConfig?.fusionTuning?.cardChoiceCount || 3;
  if (experiment?.secondaryLoop === "core_loop.wave_defense" && experiment.fusionTemplate === "defense_relics") {
    return createDeckDefenseRelicChoices();
  }
  if (experiment?.secondaryLoop === "core_loop.wave_defense" && experiment.fusionTemplate === "route_event_cards") {
    return createDeckRouteEventChoices();
  }
  const base = createDeckRewardChoices(experiment);
  const fusionCards = createDeckBuilderFusionDeckCards(experiment);
  return limitGameplayCardChoices(shuffleCards([...fusionCards, ...base]).slice(0, count), [...base, ...fusionCards], count);
}

function deckRewardPromptText(experiment) {
  if (experiment?.secondaryLoop === "core_loop.wave_defense" && experiment.fusionTemplate === "defense_relics") return "试玩：击败敌人，选择一个防线遗物";
  if (experiment?.secondaryLoop === "core_loop.wave_defense" && experiment.fusionTemplate === "route_event_cards") return "试玩：击败敌人，选择下一条路线事件";
  return "试玩：击败敌人，选择一张奖励牌";
}

function createDeckDefenseRelicChoices() {
  const rewardScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.cardRewardScale || 1;
  return shuffleCards([
    { id: "relic_arrow", kind: "relic", name: "遗物：连弩台", type: "damage", value: Math.round(5 * rewardScale), detail: "每回合防线自动伤害提高" },
    { id: "relic_wall", kind: "relic", name: "遗物：厚城墙", type: "base", value: Math.round(7 * rewardScale), detail: "基地上限和当前血量提高" },
    { id: "relic_supply", kind: "relic", name: "遗物：军需车", type: "energy", value: 1, detail: "后续每场第一回合能量 +1" },
    { id: "relic_tower", kind: "relic", name: "遗物：旧箭塔", type: "tower", value: Math.round(4 * rewardScale), detail: "立即获得一座持续防线塔" }
  ]).slice(0, 3);
}

function createDeckRouteEventChoices() {
  const rewardScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.cardRewardScale || 1;
  const riskScale = activeGameplayExperiment()?.runtimeConfig?.tuningScales?.riskPenaltyScale || 1;
  return shuffleCards([
    { id: "route_supply", kind: "route_event", name: "路线：补给道", type: "supply", value: Math.round(8 * rewardScale), basePressure: 0, detail: "获得金币和基地修复，本场压力较低" },
    { id: "route_ambush", kind: "route_event", name: "路线：伏兵道", type: "ambush", value: Math.round(11 * rewardScale), basePressure: Math.max(1, Math.round(2 * riskScale)), detail: "获得强力攻击牌，但本场基地压力提高" },
    { id: "route_fort", kind: "route_event", name: "路线：旧城寨", type: "fort", value: Math.round(5 * rewardScale), basePressure: Math.max(1, Math.round(riskScale)), detail: "获得临时防线塔，但敌方攻击更强" }
  ]).slice(0, 3);
}

function deckEnemyVfxPoint() {
  return { x: 384, y: 260 };
}

function deckPlayerVfxPoint() {
  return { x: 384, y: 540 };
}

function deckBaseVfxPoint() {
  return { x: 132, y: 396 };
}

function deckDefenseVfxPoint() {
  return { x: 248, y: 396 };
}

function deckUnitVfxPoint() {
  return { x: 300, y: 396 };
}

function playDeckBuilderCard(index) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  if (deck.status !== "playing") return;
  const card = deck.hand[index];
  if (!card) return;
  if (deck.energy < card.cost) {
    runtime.message = `试玩：能量不足，${card.name} 需要 ${card.cost}。可以结束回合，或弃一张牌换能量`;
    return;
  }
  deck.energy -= card.cost;
  if (card.type === "attack") {
    deck.enemyHp = Math.max(0, deck.enemyHp - card.value);
    deck.score += card.value;
    spawnBeamVfx(deckPlayerVfxPoint(), deckEnemyVfxPoint(), "#f59e0b");
    spawnDamageVfx(deckEnemyVfxPoint(), card.value, { color: "#ef4444", size: 15 });
  }
  if (card.type === "block") {
    deck.block += card.value;
    spawnFloatVfx(deckPlayerVfxPoint().x, deckPlayerVfxPoint().y - 44, `格挡+${card.value}`, "#38bdf8");
    spawnPulseVfx(deckPlayerVfxPoint().x, deckPlayerVfxPoint().y, "#38bdf8", { radius: 42 });
  }
  if (card.type === "energy") {
    deck.energy += card.value;
    spawnFloatVfx(deckPlayerVfxPoint().x, deckPlayerVfxPoint().y - 44, `能量+${card.value}`, "#facc15");
  }
  if (card.type === "draw") {
    drawDeckCards(deck, card.value);
    spawnFloatVfx(deckPlayerVfxPoint().x, deckPlayerVfxPoint().y - 44, `抽牌+${card.value}`, "#a855f7");
  }
  applyDeckFusionCard(card);
  deck.hand.splice(index, 1);
  deck.discardPile.push(card);
  if (deck.enemyHp <= 0) {
    completeDeckEncounter();
    return;
  }
  if (deck.energy <= 0 || deck.hand.length === 0) {
    resolveDeckBuilderEnemyTurn();
  } else {
    runtime.message = `试玩：打出${card.name}`;
  }
}

function applyDeckFusionCard(card) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  const fusion = runtime.fusion;
  if (card.type === "lane_tower") {
    fusion.deckTowers.push({
      id: nextId("deck-tower"),
      name: fusion.mode === "card_build_lane" ? "箭楼" : "防线塔",
      damage: card.value * (fusion.towerPower || 1),
      level: 1
    });
    spawnFloatVfx(deckDefenseVfxPoint().x, deckDefenseVfxPoint().y - 28, `防线+${Math.round(card.value)}/回合`, "#2563eb");
    spawnPulseVfx(deckDefenseVfxPoint().x, deckDefenseVfxPoint().y, "#2563eb", { radius: 42 });
    runtime.message = "试玩：防线塔加入牌局，每回合自动输出";
  }
  if (card.type === "lane_wall") {
    const beforeBase = fusion.baseHp;
    fusion.baseHp = Math.min(fusion.baseMaxHp, fusion.baseHp + card.value);
    deck.block += Math.round(card.value * 0.7);
    spawnHealVfx(deckBaseVfxPoint(), fusion.baseHp - beforeBase, { color: "#22c55e", text: `基地+${Math.round(fusion.baseHp - beforeBase)}` });
    spawnFloatVfx(deckPlayerVfxPoint().x, deckPlayerVfxPoint().y - 44, `格挡+${Math.round(card.value * 0.7)}`, "#38bdf8");
    runtime.message = "试玩：城墙修复，基地和格挡提高";
  }
  if (card.type === "lane_upgrade") {
    if (!fusion.deckTowers.length) {
      fusion.deckTowers.push({ id: nextId("deck-tower"), name: "箭楼", damage: 4 * (fusion.towerPower || 1), level: 1 });
    }
    fusion.deckTowers.forEach((tower) => {
      tower.level += 1;
      tower.damage *= 1 + card.value;
    });
    spawnFloatVfx(deckDefenseVfxPoint().x, deckDefenseVfxPoint().y - 28, "防线升级", "#2563eb");
    spawnPulseVfx(deckDefenseVfxPoint().x, deckDefenseVfxPoint().y, "#2563eb", { radius: 48 });
    runtime.message = "试玩：所有防线塔升级";
  }
  if (card.type === "summon_unit") {
    fusion.deckUnits.push(createDeckSummonUnit(card.name.replace("召唤", ""), card.value, 3));
    spawnFloatVfx(deckUnitVfxPoint().x, deckUnitVfxPoint().y - 28, `伙伴+${Math.round(card.value)}攻`, "#22c55e");
    spawnPulseVfx(deckUnitVfxPoint().x, deckUnitVfxPoint().y, "#22c55e", { radius: 42 });
    runtime.message = "试玩：伙伴入场，会自动攻击并吸收伤害";
  }
  if (card.type === "summon_command") {
    const damage = fusion.deckUnits.reduce((sum, unit) => sum + unit.damage, 0) + card.value;
    deck.enemyHp = Math.max(0, deck.enemyHp - damage);
    deck.score += Math.round(damage);
    spawnBeamVfx(deckUnitVfxPoint(), deckEnemyVfxPoint(), "#22c55e");
    spawnDamageVfx(deckEnemyVfxPoint(), damage, { color: "#22c55e", size: 15 });
    runtime.message = "试玩：伙伴集火造成伤害";
  }
  if (card.type === "summon_upgrade") {
    if (!fusion.deckUnits.length) fusion.deckUnits.push(createDeckSummonUnit("新兵", 3, 2));
    fusion.deckUnits.forEach((unit) => {
      unit.damage *= 1 + card.value;
      unit.duration += 1;
      unit.hp += 3;
    });
    spawnFloatVfx(deckUnitVfxPoint().x, deckUnitVfxPoint().y - 28, "伙伴成长", "#22c55e");
    spawnPulseVfx(deckUnitVfxPoint().x, deckUnitVfxPoint().y, "#22c55e", { radius: 48 });
    runtime.message = "试玩：召唤物成长，持续时间和伤害提高";
  }
  if (card.type === "survival_dodge") {
    deck.block += card.value;
    fusion.survivalPressure = Math.max(0, (fusion.survivalPressure || 0) - 1);
    spawnFloatVfx(deckPlayerVfxPoint().x, deckPlayerVfxPoint().y - 44, `格挡+${card.value}`, "#38bdf8");
    spawnFloatVfx(deckUnitVfxPoint().x, deckUnitVfxPoint().y - 28, "压力-1", "#22c55e");
    runtime.message = "试玩：翻滚降低包围压力";
  }
  if (card.type === "survival_burst") {
    deck.enemyHp = Math.max(0, deck.enemyHp - card.value);
    fusion.survivalPressure = Math.max(0, (fusion.survivalPressure || 0) - 1);
    deck.score += card.value;
    spawnBeamVfx(deckPlayerVfxPoint(), deckEnemyVfxPoint(), "#22c55e");
    spawnDamageVfx(deckEnemyVfxPoint(), card.value, { color: "#22c55e", size: 15 });
    spawnFloatVfx(deckUnitVfxPoint().x, deckUnitVfxPoint().y - 28, "压力-1", "#22c55e");
    runtime.message = "试玩：清场牌压低敌群压力";
  }
  if (card.type === "survival_heal") {
    const beforeHp = deck.playerHp;
    deck.playerHp = Math.min(30, deck.playerHp + card.value);
    spawnHealVfx(deckPlayerVfxPoint(), deck.playerHp - beforeHp, { color: "#22c55e" });
    runtime.message = "试玩：喘息恢复生命";
  }
}

function createDeckSummonUnit(name, damage, duration) {
  return {
    id: nextId("deck-unit"),
    name,
    damage,
    duration,
    hp: 10
  };
}

function resolveDeckBuilderEnemyTurn() {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  applyDeckFusionAutoTurn();
  if (deck.enemyHp <= 0) {
    completeDeckEncounter();
    return;
  }
  deck.discardMode = false;
  const incoming = deck.enemyIntent.type === "attack" ? deck.enemyIntent.value : 0;
  const routed = deckFusionIncomingDamage(incoming);
  const damage = Math.max(0, routed.playerDamage - deck.block);
  deck.playerHp = Math.max(0, deck.playerHp - damage);
  if (damage > 0) spawnDamageVfx(deckPlayerVfxPoint(), damage, { color: "#ef4444", size: 15 });
  if (incoming > 0 && deck.block > 0) {
    const blocked = Math.min(deck.block, routed.playerDamage);
    if (blocked > 0) spawnFloatVfx(deckPlayerVfxPoint().x, deckPlayerVfxPoint().y - 44, `格挡-${blocked}`, "#38bdf8");
  }
  if (routed.baseDamage > 0) {
    runtime.fusion.baseHp = Math.max(0, (runtime.fusion.baseHp || 0) - routed.baseDamage);
    spawnDamageVfx(deckBaseVfxPoint(), routed.baseDamage, { color: "#f97316", text: `基地-${routed.baseDamage}`, size: 15 });
  }
  if (deck.enemyIntent.type === "buff") {
    deck.enemyHp = Math.min(deck.enemyMaxHp, deck.enemyHp + deck.enemyIntent.value);
    spawnHealVfx(deckEnemyVfxPoint(), deck.enemyIntent.value, { color: "#a855f7", text: `蓄力+${deck.enemyIntent.value}` });
  }
  tickDeckFusionAfterEnemyTurn();
  deck.turn += 1;
  deck.energy = deckBuilderTurnEnergy(runtime);
  deck.block = 0;
  deck.discardUsedThisTurn = false;
  deck.discardPile.push(...deck.hand);
  deck.hand = [];
  drawDeckCards(deck, 5);
  deck.enemyIntent = createDeckEnemyIntent(deck.turn, state.gameplayRuntime.enemyHpMultiplier);
  runtime.cards = deck.hand;
  const failed = deck.playerHp <= 0 || runtime.fusion.baseHp <= 0;
  runtime.message = failed ? "试玩：牌局失败，点击试玩重新开始" : `试玩：敌人造成 ${damage} 点伤害，新回合开始`;
  runtime.running = !failed;
  if (failed) {
    runtime.result = "defeat";
    deck.status = "defeat";
  }
}

function applyDeckFusionAutoTurn() {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  const fusion = runtime.fusion;
  if (activeGameplayExperiment()?.secondaryLoop === "core_loop.wave_defense") {
    const towerDamage = (fusion.deckTowers || []).reduce((sum, tower) => sum + tower.damage, 0);
    const relicDamage = (fusion.deckRelics || []).filter((relic) => relic.type === "damage").reduce((sum, relic) => sum + relic.value, 0);
    const total = towerDamage + relicDamage;
    if (total > 0) {
      deck.enemyHp = Math.max(0, deck.enemyHp - total);
      deck.score += Math.round(total);
      spawnBeamVfx(deckDefenseVfxPoint(), deckEnemyVfxPoint(), "#2563eb");
      spawnDamageVfx(deckEnemyVfxPoint(), total, { color: "#2563eb", text: `防线-${Math.round(total)}`, size: 15 });
      runtime.message = `试玩：防线自动造成 ${Math.round(total)} 伤害`;
    }
  }
  if (activeGameplayExperiment()?.secondaryLoop === "core_loop.survival_growth") {
    const unitDamage = (fusion.deckUnits || []).reduce((sum, unit) => sum + unit.damage, 0);
    if (unitDamage > 0) {
      deck.enemyHp = Math.max(0, deck.enemyHp - unitDamage);
      deck.score += Math.round(unitDamage);
      spawnBeamVfx(deckUnitVfxPoint(), deckEnemyVfxPoint(), "#22c55e");
      spawnDamageVfx(deckEnemyVfxPoint(), unitDamage, { color: "#22c55e", text: `伙伴-${Math.round(unitDamage)}`, size: 15 });
      runtime.message = `试玩：伙伴自动造成 ${Math.round(unitDamage)} 伤害`;
    }
  }
}

function deckFusionIncomingDamage(incoming) {
  const runtime = state.gameplayRuntime;
  const experiment = activeGameplayExperiment();
  const fusion = runtime.fusion;
  if (experiment?.secondaryLoop === "core_loop.wave_defense") {
    const routePressure = Math.max(0, Math.round(incoming * 0.35 + (fusion.routeEvent?.basePressure || 0)));
    return {
      playerDamage: Math.max(0, incoming - routePressure),
      baseDamage: routePressure
    };
  }
  if (experiment?.secondaryLoop === "core_loop.survival_growth") {
    const pressureDamage = Math.round((fusion.survivalPressure || 0) * (experiment.fusionTemplate === "survival_turn_cards" ? 2 : 1));
    absorbDamageWithDeckUnits(incoming + pressureDamage);
    const absorbed = fusion.lastUnitAbsorb || 0;
    return {
      playerDamage: Math.max(0, incoming + pressureDamage - absorbed),
      baseDamage: 0
    };
  }
  return { playerDamage: incoming, baseDamage: 0 };
}

function absorbDamageWithDeckUnits(amount) {
  const runtime = state.gameplayRuntime;
  const units = runtime.fusion.deckUnits || [];
  let remaining = amount;
  let absorbed = 0;
  for (const unit of units) {
    if (remaining <= 0) break;
    const taken = Math.min(unit.hp, remaining);
    unit.hp -= taken;
    remaining -= taken;
    absorbed += taken;
  }
  runtime.fusion.deckUnits = units.filter((unit) => unit.hp > 0 && unit.duration > 0);
  runtime.fusion.lastUnitAbsorb = absorbed;
}

function tickDeckFusionAfterEnemyTurn() {
  const runtime = state.gameplayRuntime;
  const fusion = runtime.fusion;
  if (activeGameplayExperiment()?.secondaryLoop === "core_loop.survival_growth") {
    fusion.survivalPressure = Math.min(8, (fusion.survivalPressure || 0) + 1);
    (fusion.deckUnits || []).forEach((unit) => {
      unit.duration -= 1;
    });
    fusion.deckUnits = (fusion.deckUnits || []).filter((unit) => unit.duration > 0 && unit.hp > 0);
  }
}

function completeDeckEncounter() {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  const experiment = activeGameplayExperiment();
  deck.discardMode = false;
  if (deck.encounter >= 3) {
    deck.status = "victory";
    runtime.running = false;
    runtime.result = "victory";
    deck.score += 50;
    runtime.message = `试玩：完成 3 场牌局，分数 ${deck.score}`;
    return;
  }
  deck.status = "reward";
  deck.rewardChoices = createDeckFusionRewardChoices(experiment);
  deck.score += 25 + deck.encounter * 10;
  runtime.gold += 8;
  runtime.cards = deck.hand;
  runtime.message = deckRewardPromptText(experiment);
}

function chooseDeckReward(index) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  const reward = deck.rewardChoices[index];
  if (!reward) return;
  const wasRouteSetup = deck.status === "route_event";
  if (reward.kind === "route_event") {
    applyDeckRouteEvent(reward);
    deck.rewardChoices = [];
    if (wasRouteSetup) {
      deck.status = "playing";
      runtime.message = `试玩：${reward.name} 生效，开始本场牌局`;
      return;
    }
    startNextDeckEncounter(`试玩：选择 ${reward.name}，进入第 ${deck.encounter + 1} 场战斗`);
    return;
  }
  if (reward.kind === "relic") {
    applyDeckDefenseRelic(reward);
    deck.rewardChoices = [];
    startNextDeckEncounter(`试玩：获得 ${reward.name}，进入第 ${deck.encounter + 1} 场战斗`);
    return;
  }
  deck.discardPile.push({ ...reward, instanceId: `${reward.id}-reward-${Math.random().toString(36).slice(2, 5)}` });
  deck.rewardChoices = [];
  startNextDeckEncounter(`试玩：获得${reward.name}，进入第 ${deck.encounter + 1} 场战斗`);
}

function applyDeckDefenseRelic(relic) {
  const runtime = state.gameplayRuntime;
  runtime.fusion.deckRelics.push(relic);
  if (relic.type === "base") {
    runtime.fusion.baseMaxHp += relic.value;
    runtime.fusion.baseHp += relic.value;
  }
  if (relic.type === "energy") {
    runtime.deck.energy += relic.value;
  }
  if (relic.type === "tower") {
    runtime.fusion.deckTowers.push({ id: nextId("deck-tower"), name: "遗物箭塔", damage: relic.value, level: 1 });
  }
}

function applyDeckRouteEvent(event) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  runtime.fusion.routeEvent = event;
  if (event.type === "supply") {
    runtime.gold += event.value;
    runtime.fusion.baseHp = Math.min(runtime.fusion.baseMaxHp, runtime.fusion.baseHp + Math.round(event.value / 2));
  }
  if (event.type === "ambush") {
    deck.discardPile.push({ id: "route_ambush_strike", name: "伏击", cost: 1, type: "attack", value: event.value, instanceId: `route-ambush-${Math.random().toString(36).slice(2, 5)}` });
    runtime.enemyHpMultiplier *= 1 + 0.08 * (runtime.fusion.riskScale || 1);
  }
  if (event.type === "fort") {
    runtime.fusion.deckTowers.push({ id: nextId("deck-tower"), name: "旧城塔", damage: event.value, level: 1 });
    runtime.enemyHpMultiplier *= 1 + 0.05 * (runtime.fusion.riskScale || 1);
  }
}

function startNextDeckEncounter(message) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  deck.status = "playing";
  deck.encounter += 1;
  deck.turn += 1;
  deck.enemyMaxHp = Math.round(deck.enemyMaxHp * 1.18 + 8);
  deck.enemyHp = deck.enemyMaxHp;
  deck.energy = deckBuilderTurnEnergy(runtime);
  deck.block = 0;
  deck.discardMode = false;
  deck.discardUsedThisTurn = false;
  deck.discardPile.push(...deck.hand);
  deck.hand = [];
  drawDeckCards(deck, 5);
  deck.enemyIntent = createDeckEnemyIntent(deck.turn, state.gameplayRuntime.enemyHpMultiplier);
  runtime.cards = deck.hand;
  runtime.message = message || `试玩：进入第 ${deck.encounter} 场战斗`;
}

function drawGameplayPreview() {
  updateGameplayRuntime();
  updateGameplayVfxTick();
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  const sx = previewCanvas.width / MAP_WIDTH;
  const sy = previewCanvas.height / MAP_HEIGHT;
  previewCtx.save();
  previewCtx.scale(sx, sy);
  if (state.gameplayRuntime.mode === "survival_growth") drawSurvivalGrowthScene(previewCtx);
  else if (state.gameplayRuntime.mode === "deck_builder") drawDeckBuilderScene(previewCtx);
  else if (state.gameplayRuntime.mode === "unsupported") drawUnsupportedGameplayScene(previewCtx);
  else drawGameplayScene(previewCtx);
  previewCtx.restore();
}

function drawGameplayScene(ctx) {
  const runtime = state.gameplayRuntime;
  ctx.fillStyle = "#f6f7f2";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.strokeStyle = "#d7dce4";
  ctx.lineWidth = 1;
  for (let x = 0; x < MAP_WIDTH; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < MAP_HEIGHT; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_WIDTH, y);
    ctx.stroke();
  }

  ctx.lineWidth = 42;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#d9c48b";
  ctx.beginPath();
  runtime.route.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#b58c54";
  ctx.stroke();

  runtime.buildPoints.forEach((point) => {
    if (point.occupied) return;
    const buildTarget = isBuildPointActionable(runtime, point);
    ctx.fillStyle = buildTarget ? "rgba(34, 197, 94, 0.2)" : "rgba(37, 99, 235, 0.12)";
    ctx.strokeStyle = buildTarget ? "#16a34a" : "#2563eb";
    ctx.lineWidth = buildTarget ? 4 : 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, buildTarget ? miniGameUi.entity.buildPointActive : miniGameUi.entity.buildPoint, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (buildTarget) {
      drawMiniGameLabel(ctx, "可建造", point.x, point.y + 38, {
        maxWidth: 118,
        minChars: 5,
        height: 30,
        fill: "rgba(236, 253, 245, 0.94)",
        stroke: "#86efac",
        color: "#166534",
        fontSize: miniGameUi.font.caption
      });
    }
  });

  const base = runtime.route[runtime.route.length - 1];
  const baseSize = miniGameUi.entity.base;
  ctx.fillStyle = "#111827";
  roundRect(ctx, base.x - baseSize / 2, base.y - baseSize / 2, baseSize, baseSize, miniGameUi.radius.sm);
  ctx.fill();
  drawMiniGameLabel(ctx, "BASE", base.x, base.y - 9, {
    maxWidth: 78,
    height: 20,
    fill: "rgba(17, 24, 39, 0.92)",
    stroke: null,
    color: "#fff",
    fontSize: miniGameUi.font.caption
  });

  runtime.towers.forEach((tower) => {
    const towerTarget = isTowerActionable(runtime, tower);
    ctx.fillStyle = "rgba(37, 99, 235, 0.08)";
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
    ctx.fill();
    if (towerTarget) {
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, miniGameUi.entity.tower + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = tower.color || "#2563eb";
    ctx.beginPath();
    ctx.moveTo(tower.x, tower.y - miniGameUi.entity.tower);
    ctx.lineTo(tower.x + miniGameUi.entity.tower, tower.y + 24);
    ctx.lineTo(tower.x - miniGameUi.entity.tower, tower.y + 24);
    ctx.closePath();
    ctx.fill();
    drawTowerNameplate(ctx, tower);
  });

  runtime.enemies.forEach((enemy) => {
    ctx.fillStyle = enemy.behavior === "hunter" ? "#a855f7" : enemy.behavior === "side_base" ? "#f97316" : "#ef4444";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, miniGameUi.entity.enemy, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawMiniGameHealthBar(ctx, enemy.x - 24, enemy.y - 32, 48, enemy.hp, enemy.maxHp, {
      fill: miniGameUi.color.success,
      track: "rgba(17, 24, 39, 0.84)",
      height: 5
    });
    if (enemy.behavior) {
      drawMiniGameLabel(ctx, enemy.behavior === "hunter" ? "追英雄" : "袭基地", enemy.x, enemy.y + 22, {
        maxWidth: 108,
        minChars: 5,
        height: 30,
        fill: "rgba(17, 24, 39, 0.86)",
        stroke: null,
        color: "#fff",
        fontSize: miniGameUi.font.caption
      });
    }
  });

  runtime.projectiles.forEach((projectile) => {
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  if (runtime.heroEnabled) {
    if (runtime.hero.defeatedTimer > 0) {
      const revivePoint = pointOnRoute(runtime.route, 0.72);
      ctx.fillStyle = "rgba(100, 116, 139, 0.28)";
      ctx.beginPath();
      ctx.arc(revivePoint.x, revivePoint.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#475569";
      drawMiniGameLabel(ctx, "英雄恢复中", revivePoint.x, revivePoint.y + 30, {
        maxWidth: 136,
        minChars: 5,
        fill: "rgba(255, 255, 255, 0.9)",
        stroke: "#cbd5e1",
        color: miniGameUi.color.muted
      });
    } else {
      ctx.fillStyle = "#22c55e";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;
      roundRect(ctx, runtime.hero.x - miniGameUi.entity.heroWidth / 2, runtime.hero.y - miniGameUi.entity.heroHeight / 2, miniGameUi.entity.heroWidth, miniGameUi.entity.heroHeight, miniGameUi.entity.heroWidth / 2);
      ctx.fill();
      ctx.stroke();
      drawMiniGameHealthBar(ctx, runtime.hero.x - 32, runtime.hero.y - 42, 64, runtime.hero.hp, runtime.hero.maxHp, {
        fill: miniGameUi.color.success,
        track: "rgba(17, 24, 39, 0.84)",
        height: 5
      });
      drawMiniGameLabel(ctx, runtime.hero.mode === "free" ? "英雄 自由" : "英雄 路径", runtime.hero.x, runtime.hero.y + 34, {
        maxWidth: 136,
        minChars: 5,
        fill: "rgba(255, 255, 255, 0.92)",
        stroke: "#bbf7d0",
        color: "#064e3b"
      });
    }
  }

  drawGameplayVfx(ctx);
  drawGameplayHud(ctx);
  drawRuntimeToast(ctx, {
    hasBottomCards: Boolean(runtime.cards.length),
    prefix: runtime.cards.length ? "" : waveDefenseEmptyHint(runtime)
  });
  drawTowerMenu(ctx);
  drawUpgradeChoices(ctx);
  drawRuntimeResult(ctx);
}

function drawGameplayHud(ctx) {
  const runtime = state.gameplayRuntime;
  const metrics = [
    ["基地", Math.round(runtime.baseHp)],
    ["金币", Math.floor(runtime.gold)],
    ["波次", `${runtime.wave}/${runtime.maxWaves}`],
    ["敌军", `${runtime.waveSpawned}/${runtime.waveTarget}`]
  ];
  if (activeGameplayExperiment()?.secondaryLoop === "core_loop.survival_growth") {
    metrics.push(["英雄", `${Math.round(runtime.hero.hp)}/${runtime.hero.maxHp}`]);
    if (runtime.fusion.mode === "hero_growth_defense") metrics.push(["经验", `${runtime.exp.toFixed(1)}/${runtime.fusion.heroGrowthThreshold || 8}`]);
    else metrics.push(["防御塔", runtime.towers.length]);
  } else if (runtime.fusion.mode === "build_cards") {
    metrics.push(["防御塔", runtime.towers.length]);
    metrics.push(["牌库/弃牌", `${runtime.fusion.drawPile.length}/${runtime.fusion.discardPile.length}`]);
  } else if (runtime.fusion.mode === "risk_contract") {
    metrics.push(["防御塔", runtime.towers.length]);
    metrics.push(["风险", runtime.fusion.risk.extraEnemies + runtime.fusion.risk.leakDamage]);
  } else {
    metrics.push(["防御塔", runtime.towers.length]);
  }
  drawGameplayHudShell(ctx);
  drawGameplayHudMetrics(ctx, metrics);

  if (runtime.cards.length) {
    drawGameplayBottomCards(ctx, runtime.cards, { action: "点击选择", costLabel: "费用" });
  }
}

function drawGameplayHudShell(ctx) {
  drawMiniGamePanel(ctx, 18, 18, MAP_WIDTH - 36, 104, {
    radius: miniGameUi.radius.md,
    fill: miniGameUi.color.panel,
    stroke: "rgba(255,255,255,0.08)",
    shadow: true
  });
}

function drawGameplayHudMetrics(ctx, metrics) {
  const count = metrics.length || 1;
  const gap = count > 5 ? 10 : 14;
  const hudX = 18;
  const innerWidth = MAP_WIDTH - 36 - 48;
  const width = Math.floor((innerWidth - gap * (count - 1)) / count);
  const totalWidth = width * count + gap * (count - 1);
  const startX = Math.round(hudX + (MAP_WIDTH - 36 - totalWidth) / 2);
  metrics.forEach((metric, index) => drawGameplayHudMetric(ctx, metric[0], metric[1], startX + index * (width + gap), 40, width));
}

function drawGameplayHudMetric(ctx, label, value, x, y, width) {
  drawMiniGameMetric(ctx, label, value, x, y, width, { dark: true });
}

function drawRuntimeToast(ctx, options = {}) {
  const runtime = state.gameplayRuntime;
  if (!runtime?.message || runtime.result || runtime.towerMenu || runtime.upgradeChoices?.length) return;
  const hasBottomCards = options.hasBottomCards ?? Boolean(runtime.cards?.length);
  const prefix = options.prefix || "";
  const toastHeight = options.height || 82;
  const cardTop = options.cardsTop ?? (MAP_HEIGHT - 58 - 150);
  const y = options.y ?? (hasBottomCards ? cardTop - toastHeight - 28 : MAP_HEIGHT - toastHeight - 44);
  drawMiniGameToast(ctx, `${prefix}${runtime.message}`, {
    x: options.x ?? 44,
    y,
    width: options.width ?? MAP_WIDTH - 88,
    height: toastHeight
  });
}

function isBuildPointActionable(runtime, point) {
  if (point.occupied) return false;
  if (runtime.fusion.mode !== "build_cards") return false;
  return runtime.fusion.buildSelection?.type === "build_tower";
}

function isTowerActionable(runtime, tower) {
  if (runtime.fusion.mode !== "build_cards") return false;
  const card = runtime.fusion.buildSelection;
  if (!card) return false;
  if (card.type === "build_upgrade") return tower.level < tower.maxLevel;
  return card.type === "build_buff";
}

function drawTowerNameplate(ctx, tower) {
  const label = `${tower.name} Lv.${tower.level}`;
  drawMiniGameLabel(ctx, label, tower.x, tower.y + 30, {
    maxWidth: 150,
    minChars: 5,
    fill: "rgba(255, 255, 255, 0.92)",
    stroke: "#cbd5e1",
    color: miniGameUi.color.text
  });
}

function drawTowerMenu(ctx) {
  const menu = state.gameplayRuntime.towerMenu;
  if (!menu) return;
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.font = miniGameFont(24, 800);
  wrapCanvasText(ctx, menu.title, 76, 462, MAP_WIDTH - 152, 28, 1);
  ctx.font = miniGameFont(miniGameUi.font.body, 600);
  ctx.fillStyle = "#cbd5e1";
  wrapCanvasText(ctx, menu.subtitle, 76, 492, MAP_WIDTH - 152, 20, 1);
  menu.options.forEach((option, index) => {
    const x = 76 + index * 210;
    const y = 516;
    drawMiniGameActionCard(ctx, { x, y, width: 186, height: 188 }, {
      title: option.name,
      meta: `费用 ${option.cost}`,
      detail: option.detail
    }, {
      tone: option.cost <= state.gameplayRuntime.gold ? "green" : "slate",
      titleSize: miniGameUi.font.body,
      titleY: 44,
      titleLineHeight: 28,
      metaY: 90,
      detailY: 122,
      detailLineHeight: 22,
      detailMaxLines: 3,
      detailColor: option.cost <= state.gameplayRuntime.gold ? "#475569" : "#94a3b8",
      pad: 18
    });
  });
  ctx.font = miniGameFont(miniGameUi.font.label, 600);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("点击卡片确认，点击空白关闭", 76, 736);
}

function gameplayHudTitle(fallback) {
  const primary = primaryLoopLabel(state.gameplayTuning.primaryLoop);
  const theme = state.gameplaySkeleton?.theme?.setting === "three_kingdoms" ? "三国" : "";
  return `${theme}${primary}` || fallback;
}

function waveDefenseHudActionText(runtime) {
  const spec = runtime.fusion.ruleSpec || gameplayRuleSpec(runtime.fusion.mode);
  const heroRule = runtime.heroEnabled ? (runtime.hero.mode === "free" ? "英雄全场移动" : "英雄沿路拦截") : "英雄关闭";
  if (runtime.fusion.mode === "wave_tactic_cards") return `${spec?.label || "战术牌"} · 选择一张战术牌后开战`;
  if (runtime.fusion.mode === "risk_contract") return `${spec?.label || "风险契约"} · 增援 ${runtime.fusion.risk.extraEnemies} · 漏怪+${runtime.fusion.risk.leakDamage}`;
  if (runtime.fusion.mode === "build_cards") {
    if (!runtime.fusion.buildSelection) return `${spec?.label || "牌组防线"} · 手牌 ${runtime.fusion.hand.length} · 抽 ${runtime.fusion.drawPile.length} · 弃 ${runtime.fusion.discardPile.length}`;
    if (runtime.fusion.buildSelection.type === "build_tower") return `已选 ${runtime.fusion.buildSelection.name} · 点击绿色空位建造`;
    return `已选 ${runtime.fusion.buildSelection.name} · 点击绿色高亮的已有塔`;
  }
  return `${spec?.label || "塔防"} · 建塔 ${currentGameplayBuildCost(runtime)} · ${heroRule}`;
}

function waveDefenseEmptyHint(runtime) {
  if (runtime.fusion.mode === "build_cards") return "先选一张建造或升级牌；";
  if (runtime.fusion.mode === "wave_tactic_cards" || runtime.fusion.mode === "risk_contract") return "等待下一次波前选择；";
  return "空位建塔；已有塔升级；钱不够会保留提示。";
}

function drawSurvivalGrowthScene(ctx) {
  const runtime = state.gameplayRuntime;
  const player = runtime.player;
  ctx.fillStyle = "#f5f7fb";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.strokeStyle = "#d7dde7";
  ctx.lineWidth = 1;
  for (let x = 0; x < MAP_WIDTH; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_HEIGHT);
    ctx.stroke();
  }
  for (let y = 128; y < MAP_HEIGHT; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_WIDTH, y);
    ctx.stroke();
  }
  runtime.orbs.forEach((orb) => {
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  drawSurvivalTowerFusion(ctx);
  runtime.enemies.forEach((enemy) => {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, miniGameUi.entity.enemy, 0, Math.PI * 2);
    ctx.fill();
    drawMiniGameHealthBar(ctx, enemy.x - 22, enemy.y - 30, 44, enemy.hp, enemy.maxHp, {
      fill: miniGameUi.color.success,
      track: "rgba(17, 24, 39, 0.84)",
      height: 4
    });
  });
  ctx.fillStyle = "rgba(34,197,94,0.08)";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.attackRange, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#22c55e";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  roundRect(ctx, player.x - miniGameUi.entity.heroWidth / 2, player.y - miniGameUi.entity.heroHeight / 2, miniGameUi.entity.heroWidth, miniGameUi.entity.heroHeight, miniGameUi.entity.heroWidth / 2);
  ctx.fill();
  ctx.stroke();
  drawMiniGameHealthBar(ctx, player.x - 32, player.y - 42, 64, player.hp, player.maxHp, {
    fill: miniGameUi.color.danger,
    track: "rgba(17, 24, 39, 0.84)",
    height: 5
  });
  drawGameplayVfx(ctx);
  drawSurvivalHud(ctx);
  drawRuntimeCards(ctx, runtime.cards);
  drawRuntimeToast(ctx, { hasBottomCards: Boolean(runtime.cards?.length) });
  drawUpgradeChoices(ctx);
  drawRuntimeResult(ctx);
}

function drawSurvivalTowerFusion(ctx) {
  const runtime = state.gameplayRuntime;
  if (!isSurvivalTowerFusionMode(runtime.fusion.mode)) return;
  (runtime.fusion.barricades || []).forEach((zone) => {
    ctx.fillStyle = "rgba(20, 184, 166, 0.12)";
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawMiniGameLabel(ctx, "路障减速", zone.x, zone.y - 12, {
      maxWidth: 136,
      minChars: 5,
      fill: "rgba(255, 255, 255, 0.9)",
      stroke: "#99f6e4",
      color: miniGameUi.color.accentDark
    });
  });
  const base = runtime.fusion.base;
  if (base) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
    ctx.beginPath();
    ctx.arc(base.x, base.y, base.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    roundRect(ctx, base.x - 38, base.y - 38, 76, 76, 12);
    ctx.fill();
    drawMiniGameLabel(ctx, `据点 Lv.${base.level}`, base.x, base.y - 6, {
      maxWidth: 136,
      minChars: 5,
      fill: "rgba(17, 24, 39, 0.86)",
      stroke: null,
      color: "#fff"
    });
    drawMiniGameHealthBar(ctx, base.x - 42, base.y - 54, 84, base.hp, base.maxHp, {
      fill: miniGameUi.color.success,
      track: "rgba(17, 24, 39, 0.84)",
      height: 6
    });
  }
  (runtime.fusion.turrets || []).forEach((turret) => {
    ctx.fillStyle = "rgba(37, 99, 235, 0.08)";
    ctx.beginPath();
    ctx.arc(turret.x, turret.y, turret.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2563eb";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(turret.x, turret.y - 24);
    ctx.lineTo(turret.x + 24, turret.y + 20);
    ctx.lineTo(turret.x - 24, turret.y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawMiniGameLabel(ctx, `${Math.ceil(turret.remaining)}s`, turret.x, turret.y + 22, {
      maxWidth: 104,
      minChars: 4,
      height: 20,
      fill: "rgba(255, 255, 255, 0.9)",
      stroke: "#bfdbfe",
      color: "#1e3a8a",
      fontSize: miniGameUi.font.caption
    });
  });
  runtime.projectiles.forEach((projectile) => {
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawSurvivalHud(ctx) {
  const runtime = state.gameplayRuntime;
  const player = runtime.player;
  const hasCardDeck = isSurvivalCardDeckMode(runtime.fusion.mode);
  const hasTowerFusion = isSurvivalTowerFusionMode(runtime.fusion.mode);
  const metrics = [
    ["生命", `${Math.round(player.hp)}/${player.maxHp}`],
    ["等级", player.level],
    ["经验", `${runtime.exp.toFixed(1)}/${player.level * 5}`],
    ["击杀", runtime.kills],
    ["时间", `${Math.floor(runtime.time)}/${runtime.runGoalSeconds}s`],
    [survivalFusionMetricLabel(runtime, hasCardDeck, hasTowerFusion), survivalFusionMetricValue(runtime, hasCardDeck, hasTowerFusion)]
  ];
  drawGameplayHudShell(ctx);
  drawGameplayHudMetrics(ctx, metrics);
}

function survivalTowerHudAction(runtime) {
  if (runtime.fusion.mode === "portable_turret_ring") return `零件 ${runtime.fusion.parts || 0} · 部署 ${runtime.fusion.deployCost || 4} · 点击角色附近`;
  if (runtime.fusion.mode === "survival_base_zone") return `零件 ${runtime.fusion.parts || 0} · 点击据点修复/升级`;
  if (runtime.fusion.mode === "tower_skill_loadout") return `充能 ${runtime.fusion.skillCharges || 0}/${runtime.fusion.skillChargeMax || 4} · 点击技能牌`;
  return "";
}

function survivalFusionMetricLabel(runtime, hasCardDeck, hasTowerFusion) {
  if (hasCardDeck) return "牌库/弃牌";
  if (runtime.fusion.mode === "risk_event_cards") return "风险";
  if (!hasTowerFusion) return "手牌";
  if (runtime.fusion.mode === "survival_base_zone") return "据点";
  if (runtime.fusion.mode === "tower_skill_loadout") return "充能";
  return "炮台";
}

function survivalFusionMetricValue(runtime, hasCardDeck, hasTowerFusion) {
  if (hasCardDeck) return `${runtime.fusion.drawPile.length}/${runtime.fusion.discardPile.length}`;
  if (runtime.fusion.mode === "risk_event_cards") return runtime.fusion.risk.eventLevel || 0;
  if (!hasTowerFusion) return runtime.cards?.length || 0;
  if (runtime.fusion.mode === "survival_base_zone") return `${Math.round(runtime.fusion.base?.hp || 0)}/${runtime.fusion.base?.maxHp || 0}`;
  if (runtime.fusion.mode === "tower_skill_loadout") return `${runtime.fusion.skillCharges || 0}/${runtime.fusion.skillChargeMax || 4}`;
  return `${runtime.fusion.turrets?.length || 0}`;
}

function drawDeckBuilderScene(ctx) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  drawMiniGamePanel(ctx, 210, 170, 348, 180, {
    radius: miniGameUi.radius.lg,
    fill: "#fee2e2",
    stroke: miniGameUi.color.danger,
    lineWidth: 3,
    shadow: true
  });
  ctx.fillStyle = "#111827";
  ctx.font = miniGameFont(miniGameUi.font.display, 800);
  ctx.fillText("敌方核心", 318, 230);
  ctx.font = miniGameFont(22, 800);
  ctx.fillText(`${Math.ceil(deck.enemyHp)} / ${Math.ceil(deck.enemyMaxHp)}`, 342, 285);
  ctx.font = miniGameFont(15, 800);
  ctx.fillStyle = "#991b1b";
  ctx.fillText(`意图：${deck.enemyIntent.label} ${deck.enemyIntent.value}`, 318, 322);
  drawDeckFusionBoard(ctx);
  drawMiniGamePanel(ctx, 210, 450, 348, 160, {
    radius: miniGameUi.radius.lg,
    fill: "#dcfce7",
    stroke: miniGameUi.color.success,
    lineWidth: 3,
    shadow: true
  });
  ctx.fillStyle = "#111827";
  ctx.font = miniGameFont(24, 800);
  ctx.fillText("玩家", 352, 506);
  ctx.font = miniGameFont(miniGameUi.font.title, 800);
  ctx.fillText(`生命 ${deck.playerHp} · 格挡 ${deck.block} · 能量 ${deck.energy}`, 270, 558);
  drawDeckActionButtons(ctx);
  drawGameplayVfx(ctx);
  drawDeckHud(ctx);
  drawDeckHand(ctx);
  drawRuntimeToast(ctx, {
    hasBottomCards: Boolean(deck.hand?.length),
    cardsTop: gameplayBottomCardLayout(deck.hand.length, { height: 150, bottom: 58, minWidth: 150, maxWidth: 184, gap: 14 }).slots[0]?.y
  });
  drawDeckRewards(ctx);
  drawRuntimeResult(ctx);
}

function drawDeckActionButtons(ctx) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  if (deck.status !== "playing" || runtime.result) return;
  deckActionButtonRects().forEach((button) => {
    const isDiscard = button.id === "discard";
    const active = isDiscard && deck.discardMode;
    const dark = button.id === "end_turn";
    drawMiniGamePanel(ctx, button.x, button.y, button.width, button.height, {
      radius: miniGameUi.radius.md,
      fill: active ? miniGameUi.color.accentDark : dark ? miniGameUi.color.text : "#f8fafc",
      stroke: active ? miniGameUi.color.accent : "#cbd5e1",
      lineWidth: 2,
      shadow: dark
    });
    ctx.fillStyle = active || button.id === "end_turn" ? "#fff" : "#111827";
    ctx.font = miniGameFont(15, 800);
    ctx.fillText(deckActionButtonLabel(button.id, deck), button.x + 18, button.y + 32);
  });
}

function deckActionButtonLabel(id, deck) {
  if (id === "end_turn") return "结束回合";
  if (id === "discard") {
    if (deck.discardMode) return "取消弃牌";
    return deck.discardUsedThisTurn ? "弃牌" : "弃牌 +1能量";
  }
  if (id === "forfeit") return "认输";
  return "";
}

function drawDeckHud(ctx) {
  const runtime = state.gameplayRuntime;
  const deck = runtime.deck;
  const metrics = [
    ["战斗", `${deck.encounter}/3`],
    ["回合", deck.turn],
    ["分数", deck.score],
    ["抽牌", deck.drawPile.length],
    ["弃牌", deck.discardPile.length],
    [deckFusionMetricLabel(runtime), deckFusionMetricValue(runtime)]
  ];
  drawGameplayHudShell(ctx);
  drawGameplayHudMetrics(ctx, metrics);
}

function deckFusionActionText(runtime) {
  const experiment = activeGameplayExperiment();
  if (experiment?.secondaryLoop === "core_loop.wave_defense") {
    return ` · 基地 ${Math.round(runtime.fusion.baseHp || 0)}/${runtime.fusion.baseMaxHp || 0}`;
  }
  if (experiment?.secondaryLoop === "core_loop.survival_growth") {
    return ` · 压力 ${runtime.fusion.survivalPressure || 0}`;
  }
  return "";
}

function deckFusionMetricLabel(runtime) {
  const experiment = activeGameplayExperiment();
  if (experiment?.secondaryLoop === "core_loop.wave_defense") return runtime.fusion.mode === "defense_relics" ? "遗物" : "防线";
  if (experiment?.secondaryLoop === "core_loop.survival_growth") return "伙伴/压力";
  return "能量";
}

function deckFusionMetricValue(runtime) {
  const experiment = activeGameplayExperiment();
  if (experiment?.secondaryLoop === "core_loop.wave_defense") {
    if (runtime.fusion.mode === "defense_relics") return runtime.fusion.deckRelics?.length || 0;
    return `${runtime.fusion.deckTowers?.length || 0}/${Math.round(runtime.fusion.baseHp || 0)}`;
  }
  if (experiment?.secondaryLoop === "core_loop.survival_growth") {
    return `${runtime.fusion.deckUnits?.length || 0}/${runtime.fusion.survivalPressure || 0}`;
  }
  return runtime.deck.energy;
}

function drawDeckFusionBoard(ctx) {
  const runtime = state.gameplayRuntime;
  const experiment = activeGameplayExperiment();
  if (experiment?.secondaryLoop === "core_loop.wave_defense") {
    drawMiniGamePanel(ctx, 76, 368, 616, 56, {
      radius: miniGameUi.radius.md,
      fill: "#eff6ff",
      stroke: miniGameUi.color.info,
      lineWidth: 2
    });
    ctx.fillStyle = "#111827";
    ctx.font = miniGameFont(13, 800);
    ctx.fillText(`基地 ${Math.round(runtime.fusion.baseHp || 0)}/${runtime.fusion.baseMaxHp || 0}`, 96, 402);
    (runtime.fusion.deckTowers || []).slice(0, 6).forEach((tower, index) => {
      const x = 210 + index * 62;
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.moveTo(x, 386);
      ctx.lineTo(x + 18, 416);
      ctx.lineTo(x - 18, 416);
      ctx.closePath();
      ctx.fill();
      drawMiniGameLabel(ctx, `Lv.${tower.level}`, x, 360, {
        maxWidth: 48,
        height: 18,
        fill: "rgba(255, 255, 255, 0.88)",
        stroke: "#bfdbfe",
        color: "#1e3a8a",
        fontSize: miniGameUi.font.micro
      });
    });
    (runtime.fusion.deckRelics || []).slice(0, 3).forEach((relic, index) => {
      ctx.fillStyle = "#f59e0b";
      roundRect(ctx, 500 + index * 58, 382, 48, 26, 6);
      ctx.fill();
      ctx.fillStyle = miniGameUi.color.text;
      ctx.font = miniGameFont(miniGameUi.font.micro, 800);
      ctx.fillText("遗物", 512 + index * 58, 399);
    });
    return;
  }
  if (experiment?.secondaryLoop === "core_loop.survival_growth") {
    drawMiniGamePanel(ctx, 76, 368, 616, 56, {
      radius: miniGameUi.radius.md,
      fill: "#ecfdf5",
      stroke: miniGameUi.color.success,
      lineWidth: 2
    });
    ctx.fillStyle = "#111827";
    ctx.font = miniGameFont(13, 800);
    ctx.fillText(`生存压力 ${runtime.fusion.survivalPressure || 0}`, 96, 402);
    (runtime.fusion.deckUnits || []).slice(0, 7).forEach((unit, index) => {
      const x = 228 + index * 58;
      ctx.fillStyle = "#22c55e";
      roundRect(ctx, x - 14, 382, 28, 34, 12);
      ctx.fill();
      drawMiniGameLabel(ctx, `${Math.ceil(unit.duration)}T`, x, 356, {
        maxWidth: 44,
        height: 18,
        fill: "rgba(255, 255, 255, 0.88)",
        stroke: "#bbf7d0",
        color: "#064e3b",
        fontSize: miniGameUi.font.micro
      });
    });
  }
}

function drawDeckHand(ctx) {
  const cards = state.gameplayRuntime.deck.hand;
  const layout = gameplayBottomCardLayout(cards.length, { height: 150, bottom: 58, minWidth: 150, maxWidth: 184, gap: 14 });
  cards.forEach((card, index) => {
    const slot = layout.slots[index];
    drawMiniGameActionCard(ctx, slot, {
      title: card.name,
      meta: `消耗 ${card.cost}`,
      detail: deckCardEffectText(card)
    }, {
      tone: "orange",
      titleSize: miniGameUi.font.body,
      titleY: 40,
      titleLineHeight: 28,
      metaY: 82,
      detailY: 112,
      detailLineHeight: 22,
      detailMaxLines: 2
    });
  });
}

function drawRuntimeCards(ctx, cards) {
  if (!cards?.length) return;
  const runtime = state.gameplayRuntime;
  const action = runtime.fusion.mode === "risk_event_cards" ? "点击承接风险" : "点击释放";
  drawGameplayBottomCards(ctx, cards, { action, costLabel: "消耗" });
}

function drawGameplayBottomCards(ctx, cards, options = {}) {
  const layout = gameplayBottomCardLayout(cards.length, options);
  cards.forEach((card, index) => {
    const slot = layout.slots[index];
    const costText = card.cost !== undefined ? `${options.costLabel || "消耗"} ${card.cost} · ` : "";
    drawMiniGameActionCard(ctx, slot, {
      title: card.name,
      meta: `${costText}${options.action || "点击打出"}`,
      detail: card.detail
    }, {
      tone: options.tone || "orange",
      titleSize: miniGameUi.font.body,
      titleY: 40,
      titleLineHeight: 28,
      metaY: 78,
      detailY: 108,
      detailLineHeight: 22,
      detailMaxLines: 2
    });
  });
}

function gameplayBottomCardLayout(count, options = {}) {
  const safeX = options.safeX || 44;
  const gap = options.gap || 14;
  const height = options.height || 142;
  const bottom = options.bottom || 58;
  const minWidth = options.minWidth || 172;
  const maxWidth = options.maxWidth || 224;
  const safeWidth = MAP_WIDTH - safeX * 2;
  const width = Math.max(minWidth, Math.min(maxWidth, (safeWidth - gap * Math.max(0, count - 1)) / Math.max(1, count)));
  const totalWidth = width * count + gap * Math.max(0, count - 1);
  const startX = Math.round((MAP_WIDTH - totalWidth) / 2);
  const y = MAP_HEIGHT - bottom - height;
  return {
    slots: Array.from({ length: count }, (_, index) => ({
      x: startX + index * (width + gap),
      y,
      width,
      height
    }))
  };
}

function gameplayBottomCardIndexAt(cards, x, y, options = {}) {
  if (!cards?.length) return -1;
  const layout = gameplayBottomCardLayout(cards.length, options);
  return layout.slots.findIndex((slot) => x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height);
}

function drawUpgradeChoices(ctx) {
  const runtime = state.gameplayRuntime;
  const choices = runtime.upgradeChoices;
  if (!choices?.length) return;
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.font = miniGameFont(miniGameUi.font.title, 800);
  if (isGroupedUpgradeChoices(choices)) {
    ctx.fillText(`升级 Lv.${runtime.player.level}：英雄成长 + 牌组构筑`, 88, 408);
    ctx.font = miniGameFont(miniGameUi.font.label, 800);
    ctx.fillStyle = "#bae6fd";
    ctx.fillText("英雄成长", 88, 450);
    ctx.fillText(runtime.fusion.pendingDeckAction ? `牌组目标：${runtime.fusion.pendingDeckAction.name}` : "牌组构筑", 88, 690);
  } else {
    ctx.fillText("选择一个成长方向", 88, 472);
  }
  upgradeChoiceSlots(choices).forEach((slot) => {
    const choice = slot.choice;
    const selected = (choice.group === "hero" && runtime.fusion.pendingHeroGrowth?.id === choice.id)
      || (choice.group === "deck" && runtime.fusion.pendingDeckBuild?.id === choice.id);
    drawMiniGameActionCard(ctx, slot, {
      title: choice.name,
      meta: choice.group === "deck" ? "牌组构筑" : "英雄成长",
      detail: choice.detail
    }, {
      active: selected,
      tone: choice.group === "deck" ? "blue" : "green",
      titleSize: miniGameUi.font.body,
      titleY: 42,
      titleLineHeight: 28,
      metaY: 80,
      detailY: 108,
      detailLineHeight: 22,
      detailMaxLines: 3
    });
    if (selected) {
      ctx.font = miniGameFont(miniGameUi.font.label, 800);
      ctx.fillStyle = "#047857";
      ctx.fillText("已选", slot.x + slot.width - 48, slot.y + 24);
    }
  });
}

function drawDeckRewards(ctx) {
  const choices = state.gameplayRuntime.deck.rewardChoices;
  if (!choices?.length) return;
  const deck = state.gameplayRuntime.deck;
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.font = miniGameFont(miniGameUi.font.title, 800);
  ctx.fillText(deckRewardOverlayTitle(deck, choices), 88, 552);
  choices.forEach((card, index) => {
    const x = 88 + index * 202;
    const y = 596;
    drawMiniGameActionCard(ctx, { x, y, width: 172, height: 148 }, {
      title: card.name,
      meta: card.kind ? "点击选择" : `消耗 ${card.cost}`,
      detail: card.detail || deckCardEffectText(card)
    }, {
      tone: card.kind === "relic" ? "blue" : "orange",
      titleSize: miniGameUi.font.body,
      titleY: 40,
      titleLineHeight: 28,
      metaY: 76,
      detailY: 104,
      detailLineHeight: 22,
      detailMaxLines: 2,
      pad: 18
    });
  });
}

function deckRewardOverlayTitle(deck, choices) {
  if (deck.status === "route_event") return "选择本场路线事件";
  if (choices.some((choice) => choice.kind === "relic")) return "战斗胜利，选择一个防线遗物";
  if (choices.some((choice) => choice.kind === "route_event")) return "战斗胜利，选择下一条路线";
  return "战斗胜利，选择一张加入牌组";
}

function runtimeResultContent(runtime) {
  const victory = runtime.result === "victory";
  const mode = runtime.mode;
  const message = normalizeMiniGameMessage(runtime.message);
  const title = victory
    ? mode === "deck_builder" ? "牌局验证完成" : mode === "survival_growth" ? "生存验证完成" : "波次防守完成"
    : mode === "deck_builder" ? "牌局验证失败" : mode === "survival_growth" ? "生存验证失败" : "防守验证失败";
  const summary = victory
    ? resultSuccessSummary(runtime, message)
    : resultFailureSummary(runtime, message);
  return {
    tone: victory ? "success" : "danger",
    eyebrow: victory ? "试玩通过" : "试玩失败",
    title,
    summary,
    action: victory ? "可以应用本次玩法，或继续微调强度后再试一轮。" : "点击 Replay 重新试玩，或降低压力、提高经济后再应用。",
    stats: runtimeResultStats(runtime)
  };
}

function resultSuccessSummary(runtime, fallback) {
  if (runtime.mode === "deck_builder") return `完成 ${runtime.deck.encounter} 场牌局，核心抽牌、能量和奖励循环已跑通。`;
  if (runtime.mode === "survival_growth") return `坚持 ${Math.round(runtime.time)} 秒，击杀 ${runtime.kills} 个敌人，成长循环成立。`;
  return fallback || `守住 ${runtime.maxWaves} 波，路线压力、建造和升级闭环成立。`;
}

function resultFailureSummary(runtime, fallback) {
  if (runtime.mode === "deck_builder") {
    if (runtime.deck.playerHp <= 0) return "玩家生命归零，当前牌组防御或回复不足。";
    return fallback || "牌局提前结束，需要检查敌人压力和出牌资源。";
  }
  if (runtime.mode === "survival_growth") {
    if (runtime.player.hp <= 0) return "角色生命归零，当前生存压力高于移动/输出承载。";
    if (runtime.fusion.mode === "survival_base_zone" && runtime.fusion.base?.hp <= 0) return "据点被摧毁，保护目标压力过高。";
    return fallback || "生存目标未达成，需要调低刷怪或加强成长奖励。";
  }
  if (runtime.baseHp <= 0) return "基地耐久归零，路线压力超过当前防线承载。";
  if (runtime.heroEnabled && runtime.hero.hp <= 0 && runtime.fusion.mode === "surround_zone_defense") return "英雄倒下，双失败条件过于苛刻。";
  return fallback || "本轮未达成目标，需要重新校准压力和资源。";
}

function runtimeResultStats(runtime) {
  if (runtime.mode === "deck_builder") {
    return [
      ["牌局", `${Math.min(runtime.deck.encounter, 3)}/3`],
      ["生命", Math.max(0, Math.round(runtime.deck.playerHp))],
      ["分数", runtime.deck.score],
      ["弃牌", runtime.deck.discardPile.length]
    ];
  }
  if (runtime.mode === "survival_growth") {
    return [
      ["生存", `${Math.round(runtime.time)}s`],
      ["击杀", runtime.kills],
      ["等级", runtime.player.level],
      ["生命", Math.max(0, Math.round(runtime.player.hp))]
    ];
  }
  return [
    ["波次", `${Math.min(runtime.wave, runtime.maxWaves)}/${runtime.maxWaves}`],
    ["基地", Math.max(0, Math.round(runtime.baseHp))],
    ["击杀", runtime.kills],
    ["评分", runtime.score]
  ];
}

function drawRuntimeResult(ctx) {
  const runtime = state.gameplayRuntime;
  if (!runtime.result) return;
  const content = runtimeResultContent(runtime);
  const tone = miniGameToneColor(content.tone);
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  drawMiniGamePanel(ctx, 64, 470, MAP_WIDTH - 128, 430, {
    radius: miniGameUi.radius.lg,
    fill: runtime.result === "victory" ? "#ecfdf5" : "#fff1f2",
    stroke: runtime.result === "victory" ? "#86efac" : "#fda4af",
    lineWidth: 2,
    shadow: true
  });
  drawMiniGameLabel(ctx, content.eyebrow, 100, 508, {
    align: "left",
    maxWidth: 144,
    height: 34,
    fill: runtime.result === "victory" ? "rgba(220, 252, 231, 0.9)" : "rgba(254, 226, 226, 0.92)",
    stroke: runtime.result === "victory" ? "#86efac" : "#fca5a5",
    color: tone,
    fontSize: miniGameUi.font.caption
  });
  ctx.fillStyle = miniGameUi.color.text;
  ctx.font = miniGameFont(miniGameUi.font.display, 850);
  wrapCanvasText(ctx, content.title, 100, 594, MAP_WIDTH - 200, 56, 1);
  ctx.fillStyle = miniGameUi.color.muted;
  ctx.font = miniGameFont(miniGameUi.font.body, 650);
  wrapCanvasText(ctx, content.summary, 100, 642, MAP_WIDTH - 200, 32, 2);
  content.stats.forEach((stat, index) => {
    const x = 100 + index * 142;
    drawMiniGameMetric(ctx, stat[0], stat[1], x, 720, 124, { dark: false, height: 64 });
  });
  drawMiniGamePanel(ctx, 100, 814, MAP_WIDTH - 200, 54, {
    radius: miniGameUi.radius.md,
    fill: runtime.result === "victory" ? "rgba(220, 252, 231, 0.78)" : "rgba(255, 228, 230, 0.78)",
    stroke: runtime.result === "victory" ? "#bbf7d0" : "#fecdd3"
  });
  ctx.fillStyle = tone;
  ctx.font = miniGameFont(miniGameUi.font.label, 800);
  wrapCanvasText(ctx, content.action, 124, 848, MAP_WIDTH - 248, 24, 1);
}

function drawUnsupportedGameplayScene(ctx) {
  const runtime = state.gameplayRuntime;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  drawMiniGamePanel(ctx, 58, 222, MAP_WIDTH - 116, 240, {
    radius: miniGameUi.radius.lg,
    fill: "rgba(255, 255, 255, 0.92)",
    stroke: "rgba(15, 23, 42, 0.08)",
    shadow: true
  });
  ctx.fillStyle = "#111827";
  ctx.font = miniGameFont(miniGameUi.font.display, 800);
  wrapCanvasText(ctx, runtime.placeholder?.title || "暂未支持试玩", 88, 296, MAP_WIDTH - 176, 54, 1);
  ctx.font = miniGameFont(miniGameUi.font.body, 600);
  ctx.fillStyle = "#64748b";
  wrapCanvasText(ctx, runtime.placeholder?.body || "请选择塔防、幸存者或卡牌。", 88, 354, MAP_WIDTH - 176, 32, 2);
}

function deckCardEffectText(card) {
  if (card.type === "attack") return `造成 ${card.value} 伤害`;
  if (card.type === "block") return `获得 ${card.value} 格挡`;
  if (card.type === "energy") return `获得 ${card.value} 能量`;
  if (card.type === "draw") return `抽 ${card.value} 张牌`;
  if (card.type === "lane_tower") return `建塔：回合伤害 ${Math.round(card.value)}`;
  if (card.type === "lane_wall") return `修复基地 ${Math.round(card.value)}`;
  if (card.type === "lane_upgrade") return "升级所有防线塔";
  if (card.type === "summon_unit") return `召唤伙伴 ${Math.round(card.value)} 攻`;
  if (card.type === "summon_command") return `伙伴集火 +${Math.round(card.value)}`;
  if (card.type === "summon_upgrade") return "强化召唤物";
  if (card.type === "survival_dodge") return `格挡 ${Math.round(card.value)}，降压力`;
  if (card.type === "survival_burst") return `清场 ${Math.round(card.value)}`;
  if (card.type === "survival_heal") return `治疗 ${Math.round(card.value)}`;
  return "立即生效";
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  const words = String(text).split("");
  let line = "";
  let lineY = y;
  let lines = 0;
  words.forEach((word) => {
    if (lines >= maxLines) return;
    const test = line + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      const isLastLine = lines + 1 >= maxLines;
      ctx.fillText(isLastLine ? miniGameEllipsis(ctx, line, maxWidth) : line, x, lineY);
      lines += 1;
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  });
  if (line && lines < maxLines) ctx.fillText(lines + 1 >= maxLines ? miniGameEllipsis(ctx, line, maxWidth) : line, x, lineY);
}

function renderAssets() {
  assetGrid.innerHTML = Array.from({ length: 12 }, (_, index) => {
    const name = index % 3 === 0 ? "map-scene" : index % 3 === 1 ? "character" : "ui-snapshot";
    return `
      <article class="asset-card">
        <div class="asset-thumb"></div>
        <strong>${name}-${String(index + 1).padStart(2, "0")}.png</strong>
        <span>uploads</span>
      </article>
    `;
  }).join("");
}

function createInitialBalanceTest() {
  return {
    status: "idle",
    speed: 2,
    source: "未开始",
    waveIndex: 0,
    waveTime: 0,
    waveDuration: 1,
    baseHp: 20,
    gold: 500,
    leaked: 0,
    kills: 0,
    startedAt: 0,
    finishedAt: 0,
    visualEnemies: [],
    waveResults: [],
    result: null,
    conclusion: "等待试跑",
    updatedAt: 0
  };
}

function activeBalanceProfile() {
  return balanceProfiles[state.gameType] || balanceProfiles.towerDefense;
}

function updateBalanceOverflowControls() {
  updateBalanceScrollButton(balanceMenu, balanceMenuNext);
  updateBalanceScrollButton(balanceTableScroll, balanceTableNext);
}

function updateBalanceScrollButton(scroller, button) {
  if (!scroller || !button) return;
  const canScroll = scroller.scrollWidth > scroller.clientWidth + 1;
  const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
  button.hidden = !canScroll || atEnd;
}

function scrollBalanceOverflow(scroller, type) {
  if (!scroller) return;
  const distance = type === "menu" ? Math.max(120, scroller.clientWidth * 0.55) : Math.max(220, scroller.clientWidth * 0.75);
  scroller.scrollBy({ left: distance, behavior: "smooth" });
  window.setTimeout(updateBalanceOverflowControls, 240);
}

function setBalanceMainPanel(panel) {
  state.balanceMainPanel = panel;
  balanceMainTabs.forEach((button) => button.classList.toggle("active", button.dataset.balanceMain === panel));
  balanceMainPanels.forEach((item) => item.classList.toggle("active", item.dataset.balancePanel === panel));
  if (panel === "report") renderBalanceReport();
  if (panel === "plans") renderBalancePlans();
  if (panel === "config") renderBalance();
  updateBalanceActionState();
  window.requestAnimationFrame(updateBalanceOverflowControls);
}

function levelRuleValue(id, fallback = 0) {
  const rule = activeBalanceProfile().data.rules.find((item) => item.id === id);
  return Number(rule?.value ?? fallback);
}

function startBalanceTest(source = "手动试跑") {
  const test = createInitialBalanceTest();
  test.status = "running";
  test.speed = Number(balanceTestSpeed.value || 1);
  test.source = source;
  test.baseHp = levelRuleValue("baseHp", 20);
  test.gold = levelRuleValue("initialGold", 500);
  test.startedAt = performance.now();
  test.updatedAt = test.startedAt;
  test.waveDuration = balanceWaveDuration(activeBalanceProfile().data.waves[0]);
  test.visualEnemies = createWaveVisualEnemies(activeBalanceProfile().data.waves[0]);
  state.balanceTest = test;
  renderBalanceRunSummary();
  renderBalanceReport();
}

function updateBalanceTest(now = performance.now()) {
  const test = state.balanceTest;
  if (test.status !== "running") return;
  const profile = activeBalanceProfile();
  const wave = profile.data.waves[test.waveIndex];
  if (!wave) {
    finishBalanceTest();
    return;
  }
  const delta = Math.min(0.08, Math.max(0, (now - (test.updatedAt || now)) / 1000)) * test.speed;
  test.updatedAt = now;
  test.waveTime += delta;
  test.visualEnemies.forEach((enemy) => {
    enemy.progress = Math.min(1, enemy.progress + delta / enemy.duration);
  });
  renderBalanceRunSummary();
  if (now - (test.lastReportAt || 0) > 700) {
    test.lastReportAt = now;
    if (document.querySelector('[data-balance-panel="report"]')?.classList.contains("active")) renderBalanceReport();
  }
  if (test.waveTime < test.waveDuration) return;
  completeBalanceWave(wave);
  if (test.baseHp <= 0) {
    finishBalanceTest();
    return;
  }
  test.waveIndex += 1;
  const nextWave = profile.data.waves[test.waveIndex];
  if (!nextWave) {
    finishBalanceTest();
    return;
  }
  test.waveTime = 0;
  test.waveDuration = balanceWaveDuration(nextWave);
  test.visualEnemies = createWaveVisualEnemies(nextWave);
  renderBalanceReport();
}

function completeBalanceWave(wave) {
  const test = state.balanceTest;
  const projection = projectWaveResult(wave, test.gold);
  test.baseHp = Math.max(0, test.baseHp - projection.leakDamage);
  test.gold = Math.max(0, test.gold + waveGold(wave) - projection.spend);
  test.leaked += projection.leaked;
  test.kills += projection.kills;
  test.waveResults.push({
    name: wave.name,
    leakDamage: projection.leakDamage,
    leaked: projection.leaked,
    pressure: wavePressure(wave),
    defense: projection.defense,
    goldAfter: test.gold,
    baseHpAfter: test.baseHp
  });
}

function finishBalanceTest() {
  const test = state.balanceTest;
  test.status = "finished";
  test.finishedAt = performance.now();
  test.visualEnemies = [];
  test.result = buildBalanceResult();
  test.conclusion = test.result.label;
  renderBalanceRunSummary();
  renderBalanceReport();
  appendPendingBalanceResultToChat();
}

function balanceWaveDuration(wave) {
  const count = waveEnemyCount(wave);
  return Math.max(4, count * Number(wave.spawnInterval || 1) * 0.55 + Number(wave.bossDelay || 0) * 0.25 + 4);
}

function waveEnemyCount(wave) {
  return ["knife_soldier", "iron_cavalry", "sorcerer", "eagle_scout", "boss"].reduce((sum, key) => sum + Number(wave[key] || 0), 0);
}

function createWaveVisualEnemies(wave) {
  const total = Math.min(24, Math.max(4, waveEnemyCount(wave)));
  return Array.from({ length: total }, (_, index) => {
    const lane = index % 4;
    return {
      progress: -index * 0.035,
      duration: Math.max(2.4, balanceWaveDuration(wave) * (0.74 + lane * 0.05)),
      lane,
      boss: Boolean(wave.boss && index === total - 1)
    };
  });
}

function projectWaveResult(wave, availableGold) {
  const pressure = wavePressure(wave);
  const defense = projectedDefensePower(availableGold, wave);
  const ratio = pressure / Math.max(1, defense);
  const leakDamage = Math.max(0, Math.round((ratio - 1.02) * 2.2));
  const count = waveEnemyCount(wave);
  return {
    pressure,
    defense,
    leakDamage,
    leaked: Math.min(count, Math.max(0, Math.ceil(leakDamage / 2))),
    kills: Math.max(0, count - Math.max(0, Math.ceil(leakDamage / 2))),
    spend: Math.min(availableGold, Math.round(Math.max(0, defense * 0.014)))
  };
}

function projectedDefensePower(availableGold, wave) {
  const profile = activeBalanceProfile();
  const affordableDps = profile.data.towers.reduce((sum, tower) => {
    const levelWeight = tower.level === 1 ? 1 : tower.level === 2 ? 0.42 : 0.2;
    const affordability = Math.min(1, availableGold / Math.max(1, tower.cost * 3.2));
    return sum + towerDps(tower) * levelWeight * affordability * targetCoverage(tower, wave);
  }, 0);
  const hero = profile.data.hero.find((item) => item.id === "lvbu");
  const heroDps = hero ? hero.attack / hero.interval : 0;
  return (affordableDps + heroDps * 0.7) * 18 + availableGold * 0.8;
}

function targetCoverage(tower, wave) {
  const profile = activeBalanceProfile();
  const enemies = ["knife_soldier", "iron_cavalry", "sorcerer", "eagle_scout"]
    .map((id) => ({ enemy: enemyById(id), count: Number(wave[id] || 0) }))
    .filter((item) => item.enemy && item.count > 0);
  if (!enemies.length) return 1;
  const total = enemies.reduce((sum, item) => sum + item.count, 0);
  const covered = enemies.reduce((sum, item) => sum + (canTowerHitEnemy(tower, item.enemy) ? item.count : 0), 0);
  const bossCoverage = wave.boss && tower.target !== "对空" ? 0.2 : 0;
  return Math.max(0.18, covered / total + bossCoverage);
}

function buildBalanceResult() {
  const test = state.balanceTest;
  const baseHp = test.baseHp;
  const three = levelRuleValue("threeStarHp", 16);
  const two = levelRuleValue("twoStarHp", 8);
  const one = levelRuleValue("oneStarHp", 1);
  const stars = baseHp >= three ? 3 : baseHp >= two ? 2 : baseHp >= one ? 1 : 0;
  const worstWave = [...test.waveResults].sort((a, b) => b.leakDamage - a.leakDamage || b.pressure - a.pressure)[0];
  const label = stars === 0 ? "失败" : stars === 3 ? "三星稳定" : stars === 2 ? "难度适中" : "偏难";
  return {
    label,
    stars,
    baseHp,
    worstWave,
    difficulty: stars === 0 ? "过难" : stars === 1 ? "偏难" : stars === 2 ? "合理" : "偏简单",
    recommendation: balanceRecommendation(stars, worstWave)
  };
}

function balanceRecommendation(stars, worstWave) {
  if (stars <= 1) return "建议选择“降低难度”或“平滑节奏”。";
  if (worstWave?.name === "第4波") return "建议选择“强化克制”优化对空体验。";
  if (stars === 3) return "如需提升挑战，选择“增加挑战”。";
  return "当前可继续微调关键波次，或选择方案快速试跑。";
}

function renderBalanceRunSummary() {
  const test = state.balanceTest;
  const wave = activeBalanceProfile().data.waves[test.waveIndex];
  balanceRunStatus.textContent = test.status === "running" ? `试跑中：${wave?.name || "结算中"}` : test.status === "finished" ? `试跑完成：${test.conclusion}` : "等待试跑";
  balanceRunMeta.textContent =
    test.status === "running"
      ? `来源：${test.source} / 基地 ${Math.round(test.baseHp)} / 金币 ${Math.round(test.gold)} / ${test.speed}x`
      : test.status === "finished" && test.result
        ? `星级 ${test.result.stars} / 剩余血量 ${Math.round(test.result.baseHp)} / 漏怪 ${test.leaked}`
        : "选择方案或点击开始试跑，预览区会实时显示测试过程。";
  updateBalanceActionState();
}

function updateBalanceActionState() {
  if (!runBalanceTest) return;
  const panel = state.balanceMainPanel;
  const canRun =
    panel === "report" ||
    (panel === "plans" && Boolean(state.selectedBalancePlan)) ||
    (panel === "config" && state.balanceConfigDirty);
  runBalanceTest.disabled = !canRun;
  runBalanceTest.textContent = panel === "plans" ? "应用方案并试跑" : panel === "config" ? "应用并试跑" : "开始试跑";
}

function runCurrentBalanceAction() {
  if (state.balanceMainPanel === "plans") {
    if (!state.selectedBalancePlan) return;
    state.pendingBalanceApplication = createBalanceApplicationInput("plan", state.selectedBalancePlan);
    appendStructuredChatInput(state.pendingBalanceApplication);
    applyBalancePlan(state.selectedBalancePlan);
    return;
  }
  if (state.balanceMainPanel === "config") {
    if (!state.balanceConfigDirty) return;
    state.pendingBalanceApplication = createBalanceApplicationInput("manual_config");
    appendStructuredChatInput(state.pendingBalanceApplication);
    startBalanceTest("手动数值");
    state.balanceConfigDirty = false;
    updateBalanceActionState();
    setBalanceMainPanel("report");
    return;
  }
  startBalanceTest("手动试跑");
  setBalanceMainPanel("report");
}

function renderBalanceReport() {
  const test = state.balanceTest;
  const result = test.result || buildPreviewBalanceResult();
  const issues = renderBalanceIssues().filter((item) => item.startsWith("风险")).slice(0, 3);
  const waveRows = test.waveResults.length
    ? test.waveResults.map((wave) => `<li>${escapeHtml(wave.name)}：漏怪伤害 ${wave.leakDamage}，基地剩余 ${Math.round(wave.baseHpAfter)}</li>`).join("")
    : "<li>尚未完成波次，开始试跑后会实时生成结果。</li>";
  balanceReport.innerHTML = `
    <div class="report-hero">
      <span>当前难度</span>
      <strong>${escapeHtml(result.difficulty)}</strong>
      <small>${escapeHtml(result.recommendation)}</small>
    </div>
    <div class="report-stat-grid">
      <article><span>预计星级</span><strong>${result.stars}</strong></article>
      <article><span>基地血量</span><strong>${Math.round(result.baseHp)}</strong></article>
      <article><span>漏怪数</span><strong>${test.leaked}</strong></article>
      <article><span>击杀数</span><strong>${test.kills}</strong></article>
    </div>
    <section class="report-section">
      <div class="panel-title">主要问题</div>
      ${issues.length ? issues.map((item) => `<p>${escapeHtml(item.replace("风险：", ""))}</p>`).join("") : "<p>暂无明显风险，建议用预览试跑确认实战表现。</p>"}
    </section>
    <section class="report-section">
      <div class="panel-title">试跑过程</div>
      <ul>${waveRows}</ul>
    </section>
  `;
  renderBalanceRunSummary();
}

function buildPreviewBalanceResult() {
  const baseHp = levelRuleValue("baseHp", 20);
  const pressures = activeBalanceProfile().data.waves.map(wavePressure);
  const maxIndex = pressures.indexOf(Math.max(...pressures));
  return {
    difficulty: "待测试",
    stars: "-",
    baseHp,
    recommendation: "点击开始试跑，或选择一个调整方案直接测试。",
    worstWave: activeBalanceProfile().data.waves[maxIndex]
  };
}

function renderBalancePlans() {
  const plans = [
    {
      key: "lowerDifficulty",
      title: "降低难度",
      tag: "更容易守住",
      when: "适合：前两波掉血多、新手过不去。",
      reason: "依据：第2波铁骑和第4波飞鹰是当前主要压力点。",
      effect: "效果：减少前中期漏怪，初始经济略宽松。"
    },
    {
      key: "increaseChallenge",
      title: "增加挑战",
      tag: "提高强度",
      when: "适合：三星太稳定、后期没有压迫感。",
      reason: "依据：如果试跑基地血量长期高于三星线，就需要加强后期。",
      effect: "效果：提高敌人生命和 Boss 输出，拉高通关压力。"
    },
    {
      key: "smoothPacing",
      title: "平滑节奏",
      tag: "减少突变",
      when: "适合：某一波突然暴毙，但整体难度想保留。",
      reason: "依据：检查波次压力跳变，把压力从尖峰分摊到后续波。",
      effect: "效果：第2/4波降低尖峰，第5波承接一部分压力。"
    },
    {
      key: "strengthenCounters",
      title: "强化克制",
      tag: "塔种更清晰",
      when: "适合：玩家无脑堆泛用塔，法术/对空存在感弱。",
      reason: "依据：当前存在高物抗敌人和飞行压力，需要突出克制塔价值。",
      effect: "效果：提高军师台、瞭望塔早期收益，让选择更明确。"
    }
  ];
  balancePlans.innerHTML = plans
    .map(
      (plan) => `
        <button class="balance-plan-card ${state.selectedBalancePlan === plan.key ? "selected" : ""}" data-plan-key="${plan.key}">
          <span>${escapeHtml(plan.tag)}</span>
          <strong>${escapeHtml(plan.title)}</strong>
          <small>${escapeHtml(plan.when)}</small>
          <small>${escapeHtml(plan.reason)}</small>
          <small>${escapeHtml(plan.effect)}</small>
        </button>
      `
    )
    .join("");
  updateBalanceActionState();
}

function applyBalancePlan(planKey) {
  const data = activeBalanceProfile().data;
  if (planKey === "lowerDifficulty") {
    mutateWave("wave2", { iron_cavalry: -1, reward: 20 });
    mutateWave("wave4", { eagle_scout: -2 });
    mutateRule("initialGold", 30);
  }
  if (planKey === "increaseChallenge") {
    data.enemies.forEach((enemy) => {
      enemy.hp = Math.round(enemy.hp * 1.08);
    });
    mutateBoss("liubei", { hp: 120, attack: 10 });
  }
  if (planKey === "smoothPacing") {
    mutateWave("wave2", { iron_cavalry: -1, knife_soldier: 1, reward: 10 });
    mutateWave("wave4", { eagle_scout: -2, knife_soldier: 2 });
    mutateWave("wave5", { eagle_scout: 1, sorcerer: 1 });
  }
  if (planKey === "strengthenCounters") {
    mutateTower("strategist_platform", 1, { attack: 8, cost: -10 });
    mutateTower("watchtower", 1, { attack: 8, cost: -10 });
    mutateEnemy("sorcerer", { hp: 20 });
  }
  renderBalance();
  startBalanceTest(planTitle(planKey));
  state.selectedBalancePlan = null;
  updateBalanceActionState();
  setBalanceMainPanel("report");
}

function planTitle(planKey) {
  return {
    lowerDifficulty: "降低难度",
    increaseChallenge: "增加挑战",
    smoothPacing: "平滑节奏",
    strengthenCounters: "强化克制"
  }[planKey] || "调整方案";
}

function mutateRule(id, delta) {
  const rule = activeBalanceProfile().data.rules.find((item) => item.id === id);
  if (rule) rule.value = Math.max(0, Number(rule.value || 0) + delta);
}

function mutateWave(id, changes) {
  const wave = activeBalanceProfile().data.waves.find((item) => item.id === id);
  if (!wave) return;
  Object.entries(changes).forEach(([key, delta]) => {
    wave[key] = Math.max(0, Number(wave[key] || 0) + delta);
  });
}

function mutateTower(id, level, changes) {
  const tower = activeBalanceProfile().data.towers.find((item) => item.id === id && item.level === level);
  if (!tower) return;
  Object.entries(changes).forEach(([key, delta]) => {
    tower[key] = Math.max(0, Number(tower[key] || 0) + delta);
  });
}

function mutateEnemy(id, changes) {
  const enemy = activeBalanceProfile().data.enemies.find((item) => item.id === id);
  if (!enemy) return;
  Object.entries(changes).forEach(([key, delta]) => {
    enemy[key] = Math.max(0, Number(enemy[key] || 0) + delta);
  });
}

function mutateBoss(id, changes) {
  const boss = activeBalanceProfile().data.boss.find((item) => item.id === id);
  if (!boss) return;
  Object.entries(changes).forEach(([key, delta]) => {
    boss[key] = Math.max(0, Number(boss[key] || 0) + delta);
  });
}

function renderBalanceMenu() {
  const profile = activeBalanceProfile();
  const activeKey = balanceMenu.querySelector(".active")?.dataset.balance || profile.sections[0].key;
  balanceMenu.innerHTML = profile.sections
    .map(
      (section, index) =>
        `<button class="${section.key === activeKey || (!profile.sections.some((item) => item.key === activeKey) && index === 0) ? "active" : ""}" data-balance="${section.key}">${section.label}</button>`
    )
    .join("");
  window.requestAnimationFrame(updateBalanceOverflowControls);
}

function renderBalance(key) {
  renderBalanceMenu();
  const profile = activeBalanceProfile();
  const section = profile.sections.find((item) => item.key === key) || profile.sections[0];
  balanceMenu.querySelectorAll("[data-balance]").forEach((button) => {
    button.classList.toggle("active", button.dataset.balance === section.key);
  });
  balanceTitle.textContent = section.label;
  balanceSubtitle.textContent = `${profile.title}：配置、测算、异常检查`;

  if (section.key === "metrics") {
    renderBalanceMetrics();
    return;
  }

  balanceTableHead.closest("table").dataset.balanceSection = section.key;
  const rows = profile.data[section.key] || [];
  const columns = balanceColumns[section.key] || [];
  balanceTableHead.innerHTML = `<tr>${columns.map((column, index) => `<th class="${index === 0 ? "sticky-column" : ""}" data-column-key="${column.key}">${column.label}</th>`).join("")}</tr>`;
  balanceRows.innerHTML = rows.map((row, rowIndex) => renderBalanceRow(section.key, row, rowIndex, columns)).join("");
  balanceRows.querySelectorAll("[data-balance-field]").forEach((input) => {
    input.addEventListener("change", handleBalanceInput);
  });
  insightText.innerHTML = renderBalanceSummary(section.key);
  window.requestAnimationFrame(updateBalanceOverflowControls);
}

function renderBalanceRow(sectionKey, row, rowIndex, columns) {
  return `
    <tr>
      ${columns.map((column) => renderBalanceCell(sectionKey, row, rowIndex, column)).join("")}
    </tr>
  `;
}

function renderBalanceCell(sectionKey, row, rowIndex, column) {
  const value = column.derive ? column.derive(row) : row[column.key];
  const stickyClass = column.key === columnsForSection(sectionKey)[0]?.key ? " sticky-column" : "";
  if (column.readonly) {
    return `<td class="readonly-cell${stickyClass}" data-column-key="${column.key}">${formatBalanceValue(value, column)}</td>`;
  }
  if (column.type === "number") {
    return `
      <td class="${stickyClass.trim()}" data-column-key="${column.key}">
        <input
          data-balance-section="${sectionKey}"
          data-balance-row="${rowIndex}"
          data-balance-field="${column.key}"
          type="number"
          step="${column.step || 1}"
          value="${Number(row[column.key] || 0)}"
        />
      </td>
    `;
  }
  const content = column.key === "name" ? `<strong>${escapeHtml(value)}</strong>` : escapeHtml(value ?? "");
  return `<td class="${stickyClass.trim()}" data-column-key="${column.key}">${content}</td>`;
}

function columnsForSection(sectionKey) {
  return balanceColumns[sectionKey] || [];
}

function handleBalanceInput(event) {
  const input = event.currentTarget;
  const profile = activeBalanceProfile();
  const row = profile.data[input.dataset.balanceSection]?.[Number(input.dataset.balanceRow)];
  if (!row) return;
  row[input.dataset.balanceField] = Number(input.value);
  state.balanceConfigDirty = true;
  renderBalance(input.dataset.balanceSection);
  updateBalanceActionState();
}

function formatBalanceValue(value, column = {}) {
  if (column.format === "percent") return `${Math.round(Number(value || 0) * 100)}%`;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value) >= 100) return String(Math.round(value));
    return String(Math.round(value * 10) / 10);
  }
  return escapeHtml(value ?? "");
}

function enemyById(id) {
  return activeBalanceProfile().data.enemies.find((enemy) => enemy.id === id);
}

function bossConfig() {
  return activeBalanceProfile().data.boss.find((item) => item.id === "liubei");
}

function waveTotalHp(wave) {
  const boss = bossConfig();
  return ["knife_soldier", "iron_cavalry", "sorcerer", "eagle_scout"].reduce((sum, enemyId) => {
    const enemy = enemyById(enemyId);
    return sum + (enemy ? enemy.hp * Number(wave[enemyId] || 0) : 0);
  }, (boss?.hp || 0) * Number(wave.boss || 0));
}

function waveGold(wave) {
  const boss = bossConfig();
  return ["knife_soldier", "iron_cavalry", "sorcerer", "eagle_scout"].reduce((sum, enemyId) => {
    const enemy = enemyById(enemyId);
    return sum + (enemy ? enemy.rewardGold * Number(wave[enemyId] || 0) : 0);
  }, Number(wave.reward || 0) + (boss?.rewardGold || 0) * Number(wave.boss || 0));
}

function wavePressure(wave) {
  const boss = bossConfig();
  const enemyPressure = ["knife_soldier", "iron_cavalry", "sorcerer", "eagle_scout"].reduce((sum, enemyId) => {
    const enemy = enemyById(enemyId);
    if (!enemy) return sum;
    return sum + enemy.hp * enemy.speed * enemy.leakDamage * Number(wave[enemyId] || 0);
  }, 0);
  return enemyPressure + (boss ? (boss.hp + boss.attack * 3 + boss.leakDamage * 120) * Number(wave.boss || 0) : 0);
}

function towerDps(tower) {
  return Number(tower.attack || 0) / Math.max(0.1, Number(tower.interval || 1));
}

function effectiveDps(tower, enemy) {
  const resistance = tower.damageType === "magic" ? enemy.magicResistance : enemy.physicalResistance;
  return towerDps(tower) * (1 - Number(resistance || 0));
}

function canTowerHitEnemy(tower, enemy) {
  if (tower.target === "空地") return true;
  if (tower.target === "对空") return enemy.type === "air";
  return enemy.type === "ground";
}

function renderBalanceSummary(sectionKey) {
  const profile = activeBalanceProfile();
  if (sectionKey === "towers") {
    const best = [...profile.data.towers].sort((a, b) => towerDps(b) / b.cost - towerDps(a) / a.cost)[0];
    return `<span>最高 DPS/金币：${escapeHtml(best.name)} Lv${best.level}，${formatBalanceValue(towerDps(best) / best.cost)}。</span>`;
  }
  if (sectionKey === "waves") {
    const pressures = profile.data.waves.map(wavePressure);
    const maxPressure = Math.max(...pressures);
    const maxWave = profile.data.waves[pressures.indexOf(maxPressure)];
    return `<span>最高压力波次：${escapeHtml(maxWave.name)}，压力 ${formatBalanceValue(maxPressure)}。</span>`;
  }
  if (sectionKey === "enemies") {
    const armored = profile.data.enemies.filter((enemy) => enemy.physicalResistance >= 0.7).map((enemy) => enemy.name).join("、");
    return `<span>高物抗单位：${escapeHtml(armored || "无")}；需要法术塔覆盖。</span>`;
  }
  return `<span>修改数值后会即时刷新派生指标；底部按钮会在有改动时启用。</span>`;
}

function renderBalanceIssues() {
  const profile = activeBalanceProfile();
  const issues = [
    "检查范围：波次压力跳变、空军压力、护甲克制、Boss 单体击杀时间。"
  ];
  const pressures = profile.data.waves.map(wavePressure);
  pressures.forEach((pressure, index) => {
    if (index > 0 && pressure > pressures[index - 1] * 1.6) {
      issues.push(`风险：${profile.data.waves[index].name} 压力比上一波高 ${Math.round((pressure / pressures[index - 1] - 1) * 100)}%，建议检查出怪密度或奖励。`);
    }
  });
  const airHp = profile.data.waves.reduce((sum, wave) => {
    const eagle = enemyById("eagle_scout");
    return sum + Number(wave.eagle_scout || 0) * (eagle?.hp || 0);
  }, 0);
  const antiAirDps = profile.data.towers.filter((tower) => tower.target !== "对地").reduce((sum, tower) => sum + towerDps(tower), 0);
  if (airHp > 2500 && antiAirDps < 450) issues.push("风险：飞行单位总生命偏高，但可对空塔理论 DPS 偏低，建议强化瞭望塔或降低第4-6波飞鹰数量。");
  const physicalTowerRatio = profile.data.towers.filter((tower) => tower.damageType === "physical").length / profile.data.towers.length;
  if (physicalTowerRatio > 0.55 && profile.data.enemies.some((enemy) => enemy.physicalResistance >= 0.8)) {
    issues.push("风险：物理塔占比高，同时存在 80% 以上物抗敌人，玩家可能被迫依赖军师台。");
  }
  const boss = bossConfig();
  const bestGroundDps = Math.max(
    ...profile.data.towers
      .filter((tower) => tower.target !== "对空")
      .map((tower) => effectiveDps(tower, { physicalResistance: boss.armor, magicResistance: 0, type: "ground" }))
  );
  if (boss && boss.hp / Math.max(1, bestGroundDps) > 28) issues.push("风险：Boss 单塔击杀时间超过 28 秒，建议提高 Boss 波前经济或降低 Boss 血量。");
  if (issues.length === 1) issues.push("结果：未发现明显数值异常，可以进入预览测试验证实战表现。");
  return issues;
}

function renderBalanceMetrics() {
  const profile = activeBalanceProfile();
  const waveCards = profile.data.waves
    .map(
      (wave) => `
        <article class="metric-card">
          <strong>${escapeHtml(wave.name)}</strong>
          <span>总生命 ${formatBalanceValue(waveTotalHp(wave))}</span>
          <span>总金币 ${formatBalanceValue(waveGold(wave))}</span>
          <span>压力 ${formatBalanceValue(wavePressure(wave))}</span>
        </article>
      `
    )
    .join("");
  const matchupRows = profile.data.towers
    .filter((tower) => tower.level === 1)
    .map((tower) => {
      const cells = profile.data.enemies
        .map((enemy) => {
          const dps = canTowerHitEnemy(tower, enemy) ? effectiveDps(tower, enemy) : 0;
          const ttk = dps ? enemy.hp / dps : Infinity;
          return `<td class="readonly-cell" data-column-key="${enemy.id}">${Number.isFinite(ttk) ? `${formatBalanceValue(ttk)}s` : "-"}</td>`;
        })
        .join("");
      return `<tr><td class="sticky-column" data-column-key="name"><strong>${escapeHtml(tower.name)}</strong></td>${cells}</tr>`;
    })
    .join("");
  balanceTableHead.closest("table").dataset.balanceSection = "metrics";
  balanceTableHead.innerHTML = `<tr><th class="sticky-column" data-column-key="name">Lv1 塔 TTK</th>${profile.data.enemies.map((enemy) => `<th data-column-key="${enemy.id}">${escapeHtml(enemy.name)}</th>`).join("")}</tr>`;
  balanceRows.innerHTML = matchupRows;
  insightText.innerHTML = `<div class="metric-grid">${waveCards}</div>`;
  window.requestAnimationFrame(updateBalanceOverflowControls);
}

function readImageFile(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(String(reader.result));
  reader.readAsDataURL(file);
}

function readImageFiles(files, callback) {
  const urls = [];
  let completed = 0;
  files.forEach((file, index) => {
    readImageFile(file, (url) => {
      urls[index] = url;
      completed += 1;
      if (completed === files.length) callback(urls);
    });
  });
}

function cacheImage(url, onLoad) {
  if (!url) return null;
  if (imageCache.has(url)) {
    const cached = imageCache.get(url);
    if (onLoad) {
      if (cached.complete && cached.naturalWidth) onLoad(cached);
      else cached.addEventListener("load", () => onLoad(cached), { once: true });
    }
    return cached;
  }
  const image = new Image();
  image.src = url;
  image.addEventListener("load", () => {
    if (onLoad) onLoad(image);
    renderAll();
  });
  imageCache.set(url, image);
  return image;
}

function createMapAssetObject(file, url, frames = [url]) {
  const isSequence = frames.length > 1;
  const isWebp = file.type === "image/webp" || /\.webp$/i.test(file.name);
  return {
    id: nextId("asset"),
    name: file.name.replace(/\.[^.]+$/, "") || randomObjectName("素材"),
    fileName: file.name,
    url,
    frames,
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    width: 128,
    height: 128,
    scale: 1,
    rotation: 0,
    zIndex: (state.map.objects || []).length + 1,
    playback: isSequence ? "sequence" : isWebp ? "auto" : "static",
    fps: isSequence ? 8 : 0,
    collisionMode: "none",
    blockingType: "movement",
    collisionStamps: [],
    spawnMode: "fixed",
    spawnDensity: "medium"
  };
}

function normalizeAssetSize(object) {
  const image = cacheImage(object.url);
  if (!image?.naturalWidth || object.sizeNormalized) return;
  const maxSide = 150;
  const ratio = Math.min(maxSide / image.naturalWidth, maxSide / image.naturalHeight, 1);
  object.width = Math.max(32, image.naturalWidth * ratio);
  object.height = Math.max(32, image.naturalHeight * ratio);
  object.sizeNormalized = true;
}

function assetBounds(object) {
  return {
    x: object.x - (object.width * object.scale) / 2,
    y: object.y - (object.height * object.scale) / 2,
    w: object.width * object.scale,
    h: object.height * object.scale
  };
}

function assetInstanceSize(object) {
  normalizeAssetSize(object);
  return {
    w: Math.max(18, (object.width || 64) * (object.scale || 1)),
    h: Math.max(18, (object.height || 64) * (object.scale || 1))
  };
}

function hitTestAsset(point) {
  const objects = [...(state.map.objects || [])].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  return objects.find((object) => pointInAsset(point, object)) || null;
}

function hitTestShooterAssetInstance(point) {
  if (state.gameType !== "shooter" || !state.simulation.unitTravelEnabled) return null;
  return [...(state.simulation.shooterAssetInstances || [])].reverse().find((instance) => pointInShooterAssetInstance(point, instance)) || null;
}

function pointInShooterAssetInstance(point, instance) {
  return point.x >= instance.x - instance.w / 2 && point.x <= instance.x + instance.w / 2 && point.y >= instance.y - instance.h / 2 && point.y <= instance.y + instance.h / 2;
}

function pointInAsset(point, object) {
  const bounds = assetBounds(object);
  return point.x >= bounds.x && point.x <= bounds.x + bounds.w && point.y >= bounds.y && point.y <= bounds.y + bounds.h;
}

function assetDeleteHandle(object) {
  const bounds = assetBounds(object);
  return { x: bounds.x + bounds.w - 8, y: bounds.y + 8, r: 13 };
}

function assetResizeHandle(object) {
  const bounds = assetBounds(object);
  return { x: bounds.x + bounds.w - 8, y: bounds.y + bounds.h - 8, r: 12 };
}

function assetHandleAt(point, object) {
  const bounds = assetBounds(object);
  const deleteHandle = assetDeleteHandle(object);
  if (distance(point, deleteHandle) <= deleteHandle.r + 4) return "delete";
  const resizeHandle = assetResizeHandle(object);
  if (
    point.x >= resizeHandle.x - resizeHandle.r - 8 &&
    point.x <= resizeHandle.x + resizeHandle.r + 8 &&
    point.y >= resizeHandle.y - resizeHandle.r - 8 &&
    point.y <= resizeHandle.y + resizeHandle.r + 8
  ) {
    return "resize";
  }
  if (
    point.x >= bounds.x + bounds.w * 0.72 &&
    point.x <= bounds.x + bounds.w &&
    point.y >= bounds.y + bounds.h * 0.72 &&
    point.y <= bounds.y + bounds.h
  ) {
    return "resize";
  }
  return null;
}

function findAsset(id) {
  return (state.map.objects || []).find((object) => object.id === id);
}

function assetCollisionMarks(object) {
  if (object.collisionMode === "none") return [];
  if (object.collisionMode === "brush") return object.collisionStamps || [];
  const bounds = assetBounds(object);
  const radius = Math.max(10, Math.min(26, Math.min(bounds.w, bounds.h) / 5));
  return [
    { x: bounds.x + bounds.w * 0.3, y: bounds.y + bounds.h * 0.35, r: radius },
    { x: bounds.x + bounds.w * 0.7, y: bounds.y + bounds.h * 0.35, r: radius },
    { x: bounds.x + bounds.w * 0.5, y: bounds.y + bounds.h * 0.68, r: radius }
  ];
}

function addAssetCollisionStamp(object, point) {
  object.collisionMode = "brush";
  object.collisionStamps = object.collisionStamps || [];
  object.collisionStamps.push({
    x: point.x,
    y: point.y,
    r: Math.max(8, Math.min(30, state.brushSize / 3)),
    blockingType: object.blockingType || "movement"
  });
}

function eraseAssetCollisionAt(object, point) {
  const radius = Math.max(8, state.brushSize / 2);
  object.collisionStamps = (object.collisionStamps || []).filter((stamp) => distance(point, stamp) > radius + stamp.r);
  if (!object.collisionStamps.length) object.collisionMode = "none";
}

function deleteAsset(id) {
  state.map.objects = (state.map.objects || []).filter((object) => object.id !== id);
  state.selectedCanvasEntity = null;
  state.draggingAsset = null;
  chatNotice.textContent = "素材已删除。";
  renderAll();
}

function moveAssetLayer(object, action) {
  const objects = state.map.objects || [];
  const sorted = [...objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const index = sorted.findIndex((item) => item.id === object.id);
  if (index < 0) return;
  if (action === "top") object.zIndex = Math.max(...sorted.map((item) => item.zIndex || 0), 0) + 1;
  if (action === "bottom") object.zIndex = Math.min(...sorted.map((item) => item.zIndex || 0), 1) - 1;
  if (action === "up" && index < sorted.length - 1) {
    const next = sorted[index + 1];
    [object.zIndex, next.zIndex] = [next.zIndex || 0, object.zIndex || 0];
  }
  if (action === "down" && index > 0) {
    const prev = sorted[index - 1];
    [object.zIndex, prev.zIndex] = [prev.zIndex || 0, object.zIndex || 0];
  }
  normalizeAssetLayers();
  renderAll();
}

function normalizeAssetLayers() {
  [...(state.map.objects || [])]
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    .forEach((object, index) => {
      object.zIndex = index + 1;
    });
}

function handleSelectedConfigInput(event) {
  const routeField = event.target.dataset.routeField;
  if (routeField) {
    const path = findSelectedPath();
    if (!path) return;
    if (routeField === "source") {
      const [kind, id] = event.target.value.split(":");
      path.sourceBindingKind = id ? kind : null;
      path.sourceBindingId = id || null;
      if (kind === "point" && id && !path.startPointId) path.startPointId = id;
    } else {
      path[routeField] = event.target.value;
    }
    if (state.selectedObject.source === "draft") state.draft.dirty = hasDraftChanges();
    chatNotice.textContent = `已更新${semanticLabel(path.type)}的执行关系。`;
    renderAll();
    return;
  }
  const mapField = event.target.dataset.mapField;
  if (mapField === "name") {
    state.map.name = event.target.value;
    renderMapName();
    return;
  }
  if (event.target.dataset.assetBrushSize !== undefined) {
    state.brushSize = Number(event.target.value);
    renderAll();
    return;
  }
  const field = event.target.dataset.assetField;
  if (!field || state.selectedCanvasEntity?.kind !== "asset") return;
  const object = findAsset(state.selectedCanvasEntity.id);
  if (!object) return;
  const numericFields = new Set(["x", "y", "scale", "zIndex", "fps"]);
  object[field] = numericFields.has(field) ? Number(event.target.value) : event.target.value;
  if (field === "collisionMode" && object.collisionMode !== "brush") state.assetEditMode = "move";
  if (field === "name" && event.type === "input") return;
  renderAll();
}

function handleSelectedConfigClick(event) {
  const collisionAction = event.target.dataset.assetCollisionAction;
  if (collisionAction) {
    state.assetCollisionAction = state.assetCollisionAction === collisionAction ? "none" : collisionAction;
    renderAll();
    return;
  }
  const assetBlockingType = event.target.dataset.assetBlockingType;
  if (assetBlockingType && state.selectedCanvasEntity?.kind === "asset") {
    const object = findAsset(state.selectedCanvasEntity.id);
    if (object) {
      object.blockingType = assetBlockingType;
      object.collisionMode = object.collisionStamps?.length ? "brush" : object.collisionMode;
      renderAll();
    }
    return;
  }
  const assetSpawnMode = event.target.dataset.assetSpawnMode;
  if (assetSpawnMode && state.selectedCanvasEntity?.kind === "asset") {
    const object = findAsset(state.selectedCanvasEntity.id);
    if (object) {
      object.spawnMode = assetSpawnMode;
      resetSimulation();
      if (assetSpawnMode === "scroll_random" && state.gameType === "shooter" && state.simulation.unitTravelEnabled) {
        spawnShooterAssetInstance(object, currentScrollDirection());
      }
      if (assetSpawnMode === "scroll_random") {
        chatNotice.textContent = state.simulation.unitTravelEnabled ? "已切换为随机出现，并立即生成一个运行实例。" : "已切换为随机出现；开启模拟后会随卷轴生成。";
      }
      renderAll();
    }
    return;
  }
  const assetDensity = event.target.dataset.assetDensity;
  if (assetDensity && state.selectedCanvasEntity?.kind === "asset") {
    const object = findAsset(state.selectedCanvasEntity.id);
    if (object) {
      object.spawnDensity = assetDensity;
      resetSimulation();
      renderAll();
    }
    return;
  }
  const layerAction = event.target.dataset.layerAction;
  if (layerAction && state.selectedCanvasEntity?.kind === "asset") {
    const object = findAsset(state.selectedCanvasEntity.id);
    if (object) moveAssetLayer(object, layerAction);
    renderAll();
    return;
  }
  const action = event.target.dataset.configAction;
  if (action === "clear-background") {
    state.map.backgroundUrl = null;
    state.map.backgroundName = null;
    chatNotice.textContent = "已恢复默认底图。";
    renderAll();
    return;
  }
  if (action === "clear-asset-collision" && state.selectedCanvasEntity?.kind === "asset") {
    const object = findAsset(state.selectedCanvasEntity.id);
    if (object) {
      object.collisionMode = "none";
      object.collisionStamps = [];
      chatNotice.textContent = "素材碰撞已清空。";
      renderAll();
    }
  }
}

function renderMapName() {
  chatNotice.textContent = `当前关卡：${state.map.name}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function editPoint(event, source) {
  const point = canvasPoint(event, source === "preview" ? previewCanvas : mapCanvas);
  if (source !== "preview") return point;
  return {
    x: (point.x / previewCanvas.width) * mapCanvas.width,
    y: (point.y / previewCanvas.height) * mapCanvas.height
  };
}

function selectShooterInstanceFromEvent(event, source) {
  const instance = hitTestShooterAssetInstance(editPoint(event, source));
  if (!instance) return false;
  const sourceAsset = findAsset(instance.assetId);
  if (!sourceAsset) return false;
  selectCanvasEntity("asset", sourceAsset.id);
  state.selectedShooterInstanceId = instance.id;
  chatNotice.textContent = `已选中随机出现素材：${sourceAsset.name}`;
  renderAll();
  return true;
}

function canEditOnPinnedPreview() {
  return state.previewPinned && state.activeView === "map";
}

function createEmptyDraft() {
  return {
    collisionZones: [],
    paths: [],
    placementZones: [],
    points: [],
    dirty: false
  };
}

function hasDraftChanges() {
  return (
    state.draft.collisionZones.length > 0 ||
    state.draft.paths.length > 0 ||
    state.draft.placementZones.length > 0 ||
    state.draft.points.length > 0
  );
}

function discardDraft() {
  state.draft = createEmptyDraft();
  state.draftHistory = [];
  state.activeDraftPolyline = null;
  state.activeAreaStroke = null;
}

function applyDraft() {
  if (state.activeDraftPolyline && !commitActivePolyline()) return;
  const mapApplication = createMapApplicationInput();
  state.map.collisionZones.push(...state.draft.collisionZones);
  state.map.paths.push(...state.draft.paths);
  state.map.placementZones.push(...state.draft.placementZones);
  state.map.points.push(...state.draft.points);
  clearSelectedObject();
  discardDraft();
  chatNotice.textContent = `${state.map.name} 的地图草稿已应用到预览。`;
  if (mapApplication.payload.counts.total > 0) appendMapApplicationToChat(mapApplication);
  renderAll();
}

function renderDraftStatus() {
  if (!draftStatus) return;
  const count =
    state.draft.collisionZones.length +
    state.draft.paths.length +
    state.draft.placementZones.length +
    state.draft.points.length;
  draftStatus.textContent = count
    ? `草稿：${count} 个未应用修改。Chat 修改当前地图时会自动废弃草稿。`
    : "草稿：无未应用修改";
  const warnings = mapRelationshipWarnings();
  if (warnings.length) draftStatus.textContent += ` · 待完善：${warnings[0]}${warnings.length > 1 ? ` 等 ${warnings.length} 项` : ""}`;
  if (simulationStatus) simulationStatus.textContent = state.simulation.status;
  updateToolSettings();
}

function clearCurrentDraftLayer() {
  if (state.tool === "point") {
    state.draft.points = [];
    return;
  }
  if (state.tool === "path") {
    state.draft.paths = [];
    return;
  }
  if (state.tool === "area" && collisionSemanticType(state.semanticType)) {
    state.draft.collisionZones = state.draft.collisionZones.filter((zone) => !sameAreaType(zone));
    return;
  }
  if (state.tool === "area") {
    state.draft.placementZones = state.draft.placementZones.filter((zone) => !sameAreaType(zone));
  }
}

function findPointById(id) {
  if (!id) return null;
  return [...state.map.points, ...state.draft.points].find((point) => point.id === id) || null;
}

function mapRelationshipWarnings() {
  const data = mergedMapData();
  const movementRoutes = data.paths.filter((path) => path.type === "movement_route");
  const warnings = [];
  movementRoutes.forEach((path) => {
    if (!(path.sourceBindingId || path.startPointId)) warnings.push(`${path.name || "移动路线"}缺少执行来源`);
    if (!path.startPointId) warnings.push(`${path.name || "移动路线"}缺少起点`);
    if (!path.endPointId) warnings.push(`${path.name || "移动路线"}缺少终点`);
  });
  data.points.filter((point) => point.type === "enemy_spawn").forEach((point) => {
    if (!movementRoutes.some((path) => (path.sourceBindingId || path.startPointId) === point.id)) warnings.push(`${point.name || "敌人出生点"}尚未连接移动路线`);
  });
  data.points.filter((point) => point.type === "tower_core").forEach((point) => {
    if (!movementRoutes.some((path) => path.startPointId === point.id || path.endPointId === point.id || path.waypointPointIds?.includes(point.id))) {
      warnings.push(`${point.name || "攻击目标点"}尚未接入移动路线`);
    }
  });
  return warnings;
}

function findPointAt(pos) {
  const points = [
    ...state.map.points.map((item) => ({ item, source: "map" })),
    ...state.draft.points.map((item) => ({ item, source: "draft" }))
  ];
  return [...points].reverse().find(({ item }) => distance(item, pos) <= (item.type === "tower_core" ? 22 : 18)) || null;
}

function deletePointById(id) {
  const before = state.map.points.length + state.draft.points.length;
  state.map.points = state.map.points.filter((point) => point.id !== id);
  state.draft.points = state.draft.points.filter((point) => point.id !== id);
  [...state.map.paths, ...state.draft.paths].forEach((path) => {
    if (path.startPointId === id) path.startPointId = null;
    if (path.endPointId === id) path.endPointId = null;
    path.waypointPointIds = (path.waypointPointIds || []).filter((pointId) => pointId !== id);
  });
  clearSelectedObject(id);
  if (before !== state.map.points.length + state.draft.points.length) {
    chatNotice.textContent = "选中点位已删除。";
  }
  renderAll();
}

function findPathAt(pos) {
  const paths = [
    ...state.map.paths.map((item) => ({ item, source: "map" })),
    ...state.draft.paths.map((item) => ({ item, source: "draft" }))
  ];
  return [...paths].reverse().find(({ item }) => pointNearPath(pos, item, Math.max(14, (item.width || state.pathWidth) / 2 + 8))) || null;
}

function findAreaAt(pos) {
  const areas = [
    ...state.map.collisionZones.map((item) => ({ item, bucket: "collisionZones", source: "map" })),
    ...state.map.placementZones.map((item) => ({ item, bucket: "placementZones", source: "map" })),
    ...state.draft.collisionZones.map((item) => ({ item, bucket: "collisionZones", source: "draft" })),
    ...state.draft.placementZones.map((item) => ({ item, bucket: "placementZones", source: "draft" }))
  ];
  return [...areas].reverse().find(({ item }) => pointInZone(pos, item)) || null;
}

function resetSimulation() {
  state.simulation.unitsBySpawn = {};
  state.simulation.cooldownBySpawn = {};
  state.simulation.shooterEnemies = [];
  state.simulation.shooterObstacles = [];
  state.simulation.shooterAssetInstances = [];
  state.simulation.shooterAssetCooldowns = {};
  state.simulation.shooterEnemyCooldown = 0;
  state.simulation.shooterObstacleCooldown = 0;
  state.simulation.scrollOffset = 0;
  state.simulation.shooterPlayerPlaced = false;
  if (!state.simulation.unitTravelEnabled) state.simulation.status = "单位行进：未开启";
}

function updateSimulation() {
  if (!state.simulation.unitTravelEnabled) return;
  if (state.map.motion === "scroll") {
    const speed = scrollSpeedValue(state.map.scrollSpeed || "medium");
    state.simulation.scrollOffset = (state.simulation.scrollOffset + speed) % MAP_HEIGHT;
  }
  if (state.gameType === "shooter") {
    updateShooterSimulation();
    return;
  }
  const merged = mergedMapData();
  const spawns = simulationSpawnPoints(merged);
  const activeCount = Object.keys(state.simulation.unitsBySpawn).length;
  const blockedCount = Object.values(state.simulation.unitsBySpawn).filter((unit) => unit.status === "blocked").length;
  const detourCount = Object.values(state.simulation.unitsBySpawn).filter((unit) => unit.status === "detouring").length;

  spawns.forEach((spawn) => {
    state.simulation.cooldownBySpawn[spawn.id] = Math.max(0, (state.simulation.cooldownBySpawn[spawn.id] || 0) - 1);
    if (!state.simulation.unitsBySpawn[spawn.id] && state.simulation.cooldownBySpawn[spawn.id] === 0) {
      const route = buildSimulationRoute(spawn, merged);
      if (route.length > 1) {
        state.simulation.unitsBySpawn[spawn.id] = {
          id: `sim-${spawn.id}`,
          spawnId: spawn.id,
          x: spawn.x,
          y: spawn.y,
          route,
          segment: 0,
          status: "moving",
          blockedFrames: 0,
          stalledFrames: 0,
          detourSide: 0,
          detourLockFrames: 0,
          lastMoveAngle: 0,
          oscillationFrames: 0,
          lastTargetDistance: Infinity,
          arrivedFrames: 0
        };
      }
    }
  });

  Object.keys(state.simulation.unitsBySpawn).forEach((spawnId) => {
    const unit = state.simulation.unitsBySpawn[spawnId];
    advanceSimulationUnit(unit);
    if (unit.status === "arrived" && unit.arrivedFrames > 35) {
      delete state.simulation.unitsBySpawn[spawnId];
      state.simulation.cooldownBySpawn[spawnId] = 35;
    }
    if (unit.status === "blocked" && unit.blockedFrames > 90) {
      delete state.simulation.unitsBySpawn[spawnId];
      state.simulation.cooldownBySpawn[spawnId] = 50;
    }
  });

  const nextActiveCount = Object.keys(state.simulation.unitsBySpawn).length;
  state.simulation.status = spawns.length
    ? `单位行进：${nextActiveCount}/${spawns.length} 个出生点运行中${detourCount ? `，${detourCount} 个绕行` : ""}${blockedCount ? `，${blockedCount} 个被阻挡` : ""}`
    : "单位行进：未找到敌人出生点或Boss点";
  if (simulationStatus) simulationStatus.textContent = state.simulation.status;
}

function drawSimulationUnits(ctx) {
  if (!state.simulation.unitTravelEnabled) return;
  if (state.gameType === "shooter") {
    drawShooterSimulation(ctx);
    return;
  }
  Object.values(state.simulation.unitsBySpawn).forEach((unit) => {
    ctx.save();
    ctx.fillStyle = unit.status === "blocked" ? "#ef4444" : unit.status === "detouring" ? "#facc15" : unit.status === "arrived" ? "#38bdf8" : "#f97316";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(unit.status === "blocked" ? "阻挡" : unit.status === "detouring" ? "绕行" : "模拟单位", unit.x + 16, unit.y + 4);
    ctx.restore();
  });
}

function updateShooterSimulation() {
  const merged = mergedMapData();
  const playerSpawn = merged.points.find((point) => point.type === "player_spawn");
  if (playerSpawn && !state.simulation.shooterPlayerPlaced) {
    state.player.x = playerSpawn.x;
    state.player.y = playerSpawn.y;
    state.simulation.shooterPlayerPlaced = true;
  }
  const rules = merged.paths.filter((path) => path.kind === "shooter_route_rule");
  const obstacleZones = merged.placementZones.filter((zone) => zone.areaType === "obstacle_zone");
  const scrollAssets = (state.map.objects || []).filter((object) => object.spawnMode === "scroll_random");
  const direction = currentScrollDirection();
  state.simulation.shooterEnemyCooldown = Math.max(0, state.simulation.shooterEnemyCooldown - 1);
  state.simulation.shooterObstacleCooldown = Math.max(0, state.simulation.shooterObstacleCooldown - 1);
  scrollAssets.forEach((asset) => {
    state.simulation.shooterAssetCooldowns[asset.id] = Math.max(0, (state.simulation.shooterAssetCooldowns[asset.id] || 0) - 1);
  });

  if (rules.length && state.simulation.shooterEnemyCooldown === 0) {
    spawnShooterEnemy(rules[Math.floor(Math.random() * rules.length)]);
    state.simulation.shooterEnemyCooldown = cooldownForFrequency(rules[0].frequency);
  }
  if (obstacleZones.length && state.simulation.shooterObstacleCooldown === 0) {
    spawnShooterObstacle(obstacleZones[Math.floor(Math.random() * obstacleZones.length)], direction);
    state.simulation.shooterObstacleCooldown = cooldownForFrequency(obstacleZones[0].frequency || "medium") * 1.4;
  }
  scrollAssets.forEach((asset) => {
    if ((state.simulation.shooterAssetCooldowns[asset.id] || 0) > 0) return;
    spawnShooterAssetInstance(asset, direction);
    state.simulation.shooterAssetCooldowns[asset.id] = cooldownForFrequency(asset.spawnDensity || "medium") * 1.2;
  });

  state.simulation.shooterEnemies.forEach((enemy) => advanceShooterEnemy(enemy));
  state.simulation.shooterObstacles.forEach((obstacle) => advanceShooterObstacle(obstacle, direction));
  state.simulation.shooterAssetInstances.forEach((instance) => advanceShooterAssetInstance(instance, direction));
  state.simulation.shooterEnemies = state.simulation.shooterEnemies.filter((enemy) => inExtendedMap(enemy.x, enemy.y));
  state.simulation.shooterObstacles = state.simulation.shooterObstacles.filter((obstacle) => inExtendedMap(obstacle.x, obstacle.y));
  state.simulation.shooterAssetInstances = state.simulation.shooterAssetInstances.filter(assetInstanceInExtendedMap);
  if (state.selectedShooterInstanceId && !state.simulation.shooterAssetInstances.some((instance) => instance.id === state.selectedShooterInstanceId)) {
    state.selectedShooterInstanceId = null;
  }
  state.simulation.status = `射击模拟：${state.simulation.shooterEnemies.length} 敌军，${state.simulation.shooterObstacles.length} 障碍物，${state.simulation.shooterAssetInstances.length} 随机素材运行中`;
  if (simulationStatus) simulationStatus.textContent = state.simulation.status;
}

function spawnShooterEnemy(rule) {
  const point = shooterEntryPoint(rule.entry);
  const count = formationCount(rule.formation);
  for (let i = 0; i < count; i += 1) {
    state.simulation.shooterEnemies.push({
      id: nextId("enemy"),
      x: point.x + (i - (count - 1) / 2) * 28,
      y: point.y,
      baseX: point.x,
      baseY: point.y,
      direction: currentScrollDirection(),
      movement: rule.movement === "ai_random" ? randomFrom(["straight", "s_curve", "diagonal", "dive", "chase"]) : rule.movement,
      age: 0,
      speed: 1.8 + Math.random() * 0.8
    });
  }
}

function spawnShooterObstacle(zone, direction) {
  const bounds = zoneBounds(zone);
  const marks = obstacleCollisionMarks(zone);
  const point = marks.length ? randomFrom(marks) : {
    x: bounds.x + Math.random() * Math.max(1, bounds.w),
    y: bounds.y + Math.random() * Math.max(1, bounds.h),
    r: Math.max(14, Math.min(34, (zone.brushSize || 48) / 2))
  };
  state.simulation.shooterObstacles.push({
    id: nextId("obstacle"),
    x: point.x,
    y: point.y,
    r: Math.max(14, Math.min(34, point.r || (zone.brushSize || 48) / 2)),
    movement: zone.movement || "scroll",
    asset: zone.obstacleAsset || "默认障碍",
    collisionRule: zone.collisionRule || "player",
    direction
  });
}

function spawnShooterAssetInstance(asset, direction) {
  normalizeAssetSize(asset);
  const horizontal = direction === "horizontal";
  const size = assetInstanceSize(asset);
  const x = horizontal ? MAP_WIDTH + size.w / 2 : Math.random() * MAP_WIDTH;
  const y = horizontal ? Math.random() * MAP_HEIGHT : -size.h / 2;
  state.simulation.shooterAssetInstances.push({
    id: nextId("asset-instance"),
    assetId: asset.id,
    x,
    y,
    w: size.w,
    h: size.h,
    scale: asset.scale || 1,
    rotation: asset.rotation || 0,
    speed: scrollSpeedValue(state.map.scrollSpeed || mapScrollSpeed?.value || "medium"),
    driftSeed: Math.random() * 1000,
    direction
  });
}

function advanceShooterEnemy(enemy) {
  enemy.age += 1;
  const horizontal = enemy.direction === "horizontal";
  if (horizontal) enemy.x += enemy.speed;
  else enemy.y += enemy.speed;
  if (enemy.movement === "s_curve") {
    if (horizontal) enemy.y = enemy.baseY + Math.sin(enemy.age / 24) * 48;
    else enemy.x = enemy.baseX + Math.sin(enemy.age / 24) * 48;
  }
  if (enemy.movement === "diagonal") {
    if (horizontal) enemy.y += 0.7;
    else enemy.x += 0.7;
  }
  if (enemy.movement === "dive") {
    if (horizontal) enemy.x += 1.2;
    else enemy.y += 1.2;
  }
  if (enemy.movement === "chase") {
    enemy.x += Math.sign(state.player.x - enemy.x) * 0.8;
    enemy.y += Math.sign(state.player.y - enemy.y) * 0.35;
  }
}

function advanceShooterObstacle(obstacle, direction) {
  if (obstacle.movement === "fixed") return;
  if (direction === "horizontal") obstacle.x -= obstacle.movement === "drift" ? 1.9 : 1.4;
  else obstacle.y += obstacle.movement === "drift" ? 2.0 : 1.5;
  if (obstacle.movement === "drift") obstacle.x += Math.sin((obstacle.y + obstacle.x) / 40) * 0.5;
}

function advanceShooterAssetInstance(instance, direction) {
  const speed = instance.speed || scrollSpeedValue(state.map.scrollSpeed || "medium");
  if (direction === "horizontal") {
    instance.x -= speed;
    instance.y += Math.sin((instance.x + instance.driftSeed) / 80) * 0.25;
    return;
  }
  instance.y += speed;
  instance.x += Math.sin((instance.y + instance.driftSeed) / 80) * 0.25;
}

function drawShooterSimulation(ctx) {
  state.simulation.shooterEnemies.forEach((enemy) => {
    ctx.save();
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  state.simulation.shooterObstacles.forEach((obstacle) => {
    ctx.save();
    ctx.fillStyle = "rgba(100, 116, 139, 0.72)";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("障碍", obstacle.x + obstacle.r + 4, obstacle.y + 4);
    ctx.restore();
  });
  state.simulation.shooterAssetInstances.forEach((instance) => drawShooterAssetInstance(ctx, instance));
}

function drawShooterAssetInstance(ctx, instance) {
  const asset = findAsset(instance.assetId);
  const image = asset ? assetImageForObject(asset) : null;
  ctx.save();
  ctx.translate(instance.x, instance.y);
  ctx.rotate(((instance.rotation || 0) * Math.PI) / 180);
  if (image?.complete && image.naturalWidth) {
    ctx.drawImage(image, -instance.w / 2, -instance.h / 2, instance.w, instance.h);
  } else {
    ctx.fillStyle = "#dbeafe";
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.fillRect(-instance.w / 2, -instance.h / 2, instance.w, instance.h);
    ctx.strokeRect(-instance.w / 2, -instance.h / 2, instance.w, instance.h);
  }
  if (state.selectedShooterInstanceId === instance.id) {
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 5;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(-instance.w / 2 - 5, -instance.h / 2 - 5, instance.w + 10, instance.h + 10);
  }
  ctx.restore();
}

function shooterAssetInstanceCollisionMarks(instance) {
  const asset = findAsset(instance.assetId);
  if (!asset || asset.collisionMode === "none") return [];
  const sourceMarks = assetCollisionMarks(asset);
  if (!sourceMarks.length) return [];
  const sourceScale = asset.scale || 1;
  const instanceScale = instance.scale || sourceScale;
  const scaleRatio = sourceScale ? instanceScale / sourceScale : 1;
  return sourceMarks.map((mark) => ({
    x: instance.x + (mark.x - asset.x) * scaleRatio,
    y: instance.y + (mark.y - asset.y) * scaleRatio,
    r: mark.r * scaleRatio,
    blockingType: mark.blockingType || asset.blockingType
  }));
}

function shooterEntryPoint(entry) {
  if (entry === "left_random") return { x: -20, y: Math.random() * MAP_HEIGHT * 0.45 };
  if (entry === "right_random") return { x: MAP_WIDTH + 20, y: Math.random() * MAP_HEIGHT * 0.45 };
  if (entry === "edge_random") return Math.random() > 0.5 ? { x: Math.random() * MAP_WIDTH, y: -20 } : { x: Math.random() > 0.5 ? -20 : MAP_WIDTH + 20, y: Math.random() * MAP_HEIGHT * 0.45 };
  if (entry === "anchor") {
    const anchors = mergedMapData().points.filter((point) => point.type === "enemy_anchor");
    if (anchors.length) return anchors[Math.floor(Math.random() * anchors.length)];
  }
  return { x: Math.random() * MAP_WIDTH, y: -20 };
}

function formationCount(formation) {
  if (formation === "line") return 4;
  if (formation === "v") return 5;
  if (formation === "double") return 6;
  if (formation === "ai_random") return randomFrom([1, 3, 4, 5]);
  return 1;
}

function cooldownForFrequency(frequency) {
  if (frequency === "high") return 40;
  if (frequency === "low") return 130;
  return 78;
}

function scrollSpeedValue(speed) {
  if (speed === "slow") return 1.1;
  if (speed === "fast") return 2.4;
  return 1.6;
}

function currentScrollDirection() {
  return state.map.scrollDirection || mapScrollDirection?.value || "vertical";
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function obstacleCollisionMarks(zone) {
  if (zone.areaType !== "obstacle_zone") return [];
  if (zone.collisionMark === "auto") return zone.autoCollisionStamps || [];
  return zone.stamps || [];
}

function inExtendedMap(x, y) {
  return x > -120 && x < MAP_WIDTH + 120 && y > -120 && y < MAP_HEIGHT + 160;
}

function inExtendedMapWithMargin(x, y, margin = 240) {
  return x > -margin && x < MAP_WIDTH + margin && y > -margin && y < MAP_HEIGHT + margin;
}

function assetInstanceInExtendedMap(instance) {
  const margin = 80;
  const halfW = (instance.w || 0) / 2;
  const halfH = (instance.h || 0) / 2;
  return (
    instance.x + halfW > -margin &&
    instance.x - halfW < MAP_WIDTH + margin &&
    instance.y + halfH > -margin &&
    instance.y - halfH < MAP_HEIGHT + margin
  );
}

function mergedMapData() {
  return {
    collisionZones: [...state.map.collisionZones, ...state.draft.collisionZones],
    paths: [...state.map.paths, ...state.draft.paths],
    placementZones: [...state.map.placementZones, ...state.draft.placementZones],
    points: [...state.map.points, ...state.draft.points]
  };
}

function simulationSpawnPoints(data) {
  return data.points.filter((point) => ["enemy_spawn", "boss"].includes(point.type));
}

function simulationTargets(data) {
  const attackTargets = data.points.filter((point) => point.type === "tower_core");
  return attackTargets.length ? attackTargets : data.points.filter((point) => point.type === "target");
}

function buildSimulationRoute(spawn, data) {
  const boundRoute = buildBoundRouteChain(spawn, data);
  if (boundRoute.length > 1) return boundRoute;
  const path = nearestPath(spawn, data.paths);
  const target = nearestPoint(spawn, simulationTargets(data));
  if (path && target) {
    const pathPoints = orientPathBetween(path, spawn, target);
    return [spawn, ...pathPoints, target];
  }
  if (path) return [spawn, ...orientPathFromSpawn(pathRoutePoints(path), spawn)];
  if (target) return [spawn, target];
  return [];
}

function buildBoundRouteChain(spawn, data) {
  const route = [spawn];
  const used = new Set();
  let currentPointId = spawn.id;
  for (let step = 0; step < 8; step += 1) {
    const path = data.paths.find((item) =>
      item.type === "movement_route" &&
      (item.sourceBindingId || item.startPointId) === currentPointId &&
      item.points?.length >= 2 &&
      !used.has(item.id)
    );
    if (!path) break;
    used.add(path.id);
    route.push(...pathRoutePoints(path).slice(1));
    if (!path.endPointId || path.endPointId === currentPointId) break;
    currentPointId = path.endPointId;
    const endPoint = findPointById(currentPointId);
    if (endPoint && distance(route[route.length - 1], endPoint) > 1) route.push(endPoint);
    if (endPoint?.type === "target") break;
  }
  return route;
}

function nearestPath(point, paths) {
  const drawablePaths = paths.filter((path) => path.points?.length >= 2);
  if (!drawablePaths.length) return null;
  return [...drawablePaths].sort((a, b) => pathDistanceToPoint(a, point) - pathDistanceToPoint(b, point))[0];
}

function pathDistanceToPoint(path, point) {
  const points = pathRoutePoints(path);
  if (!points.length) return Infinity;
  return Math.min(...points.map((pathPoint) => distance(point, pathPoint)));
}

function orientPathFromSpawn(points, spawn) {
  if (points.length < 2) return points;
  const firstDistance = distance(spawn, points[0]);
  const lastDistance = distance(spawn, points[points.length - 1]);
  return firstDistance <= lastDistance ? points : [...points].reverse();
}

function orientPathBetween(path, spawn, target) {
  const points = pathRoutePoints(path);
  if (points.length < 2) return points;
  let nearestIndex = 0;
  points.forEach((point, index) => {
    if (distance(spawn, point) < distance(spawn, points[nearestIndex])) nearestIndex = index;
  });
  const forward = points.slice(nearestIndex);
  const backward = points.slice(0, nearestIndex + 1).reverse();
  if (!target) return forward.length >= backward.length ? forward : backward;
  const forwardEnd = forward[forward.length - 1];
  const backwardEnd = backward[backward.length - 1];
  return distance(forwardEnd, target) <= distance(backwardEnd, target) ? forward : backward;
}

function pathRoutePoints(path) {
  if (path.drawMode !== "curve" || path.points.length < 3) return path.points;
  const sampled = [];
  for (let i = 0; i < path.points.length - 1; i += 1) {
    const current = path.points[i];
    const next = path.points[i + 1];
    const mid = {
      x: (current.x + next.x) / 2,
      y: (current.y + next.y) / 2
    };
    const start = i === 0 ? current : sampled[sampled.length - 1];
    for (let step = 0; step <= 8; step += 1) {
      const t = step / 8;
      sampled.push(quadraticPoint(start, current, mid, t));
    }
  }
  const penultimate = path.points[path.points.length - 2];
  const last = path.points[path.points.length - 1];
  const start = sampled[sampled.length - 1] || path.points[0];
  for (let step = 1; step <= 8; step += 1) {
    const t = step / 8;
    sampled.push(quadraticPoint(start, penultimate, last, t));
  }
  return sampled;
}

function quadraticPoint(start, control, end, t) {
  const oneMinus = 1 - t;
  return {
    x: oneMinus * oneMinus * start.x + 2 * oneMinus * t * control.x + t * t * end.x,
    y: oneMinus * oneMinus * start.y + 2 * oneMinus * t * control.y + t * t * end.y
  };
}

function nearestPoint(point, points) {
  if (!points.length) return null;
  return [...points].sort((a, b) => distance(point, a) - distance(point, b))[0];
}

function advanceSimulationUnit(unit) {
  if (unit.status === "blocked") {
    unit.blockedFrames += 1;
    return;
  }
  if (unit.status === "arrived") {
    unit.arrivedFrames += 1;
    return;
  }
  const target = unit.route[unit.segment + 1];
  if (!target) {
    unit.status = "arrived";
    return;
  }
  const speed = 2.2;
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const length = Math.hypot(dx, dy);
  if (length <= speed) {
    unit.x = target.x;
    unit.y = target.y;
    unit.segment += 1;
    unit.status = "moving";
    unit.blockedFrames = 0;
    if (unit.segment >= unit.route.length - 1) unit.status = "arrived";
    return;
  }
  const direction = {
    x: dx / length,
    y: dy / length
  };
  const routeEnd = unit.route[unit.route.length - 1] || target;
  const move = findSimulationMove(unit, direction, speed, 11, target, routeEnd);
  if (!move) {
    if (tryAdvanceStalledSegment(unit)) return;
    unit.status = unit.blockedFrames > 70 ? "blocked" : "detouring";
    unit.blockedFrames += 1;
    unit.stalledFrames += 1;
    if (!unit.detourSide) unit.detourSide = unit.lastMoveAngle >= 0 ? 1 : -1;
    unit.detourLockFrames = Math.max(unit.detourLockFrames, 45);
    return;
  }
  const previousDistance = distance(unit, target);
  unit.x = move.x;
  unit.y = move.y;
  unit.status = move.detouring ? "detouring" : "moving";
  unit.blockedFrames = 0;
  updateDetourMemory(unit, move);
  const nextDistance = distance(unit, target);
  if (nextDistance < previousDistance - 0.35) {
    unit.stalledFrames = 0;
  } else {
    unit.stalledFrames += 1;
  }
  if (unit.stalledFrames > 90 && tryAdvanceStalledSegment(unit)) return;
  unit.lastTargetDistance = nextDistance;
}

function tryAdvanceStalledSegment(unit) {
  if (unit.segment >= unit.route.length - 2) return false;
  unit.segment += 1;
  unit.status = "detouring";
  unit.blockedFrames = 0;
  unit.stalledFrames = 0;
  unit.detourLockFrames = 72;
  return true;
}

function findSimulationMove(unit, direction, speed, radius, target, routeEnd) {
  const angles = [
    0, 15, -15, 30, -30, 45, -45, 65, -65, 90, -90, 120, -120, 150, -150, 180
  ].map((angle) => (angle * Math.PI) / 180);
  let best = null;
  angles.forEach((angle) => {
    const rotated = rotateVector(direction, angle);
    const clearance = movementClearance(unit, rotated, speed, radius);
    if (clearance <= 0) return;
    const next = {
      x: unit.x + rotated.x * speed,
      y: unit.y + rotated.y * speed,
      detouring: angle !== 0,
      angle
    };
    const lookahead = {
      x: unit.x + rotated.x * speed * clearance,
      y: unit.y + rotated.y * speed * clearance
    };
    const directPenalty = angle === 0 && unit.stalledFrames > 24 ? 90 : 0;
    const side = Math.sign(angle);
    const lockedSidePenalty = unit.detourLockFrames > 0 && side && unit.detourSide && side !== unit.detourSide ? 160 : 0;
    const switchPenalty = side && Math.sign(unit.lastMoveAngle) && side !== Math.sign(unit.lastMoveAngle) ? 60 + unit.oscillationFrames * 8 : 0;
    const escapeBonus = unit.stalledFrames > 28 && side === unit.detourSide ? -55 : 0;
    const backtrackPenalty = Math.abs(angle) === Math.PI && unit.stalledFrames < 42 ? 120 : 0;
    const score =
      distance(lookahead, target) +
      distance(lookahead, routeEnd) * 0.18 +
      Math.abs(angle) * 10 +
      directPenalty -
      clearance * 6 +
      lockedSidePenalty +
      switchPenalty +
      backtrackPenalty +
      escapeBonus;
    if (!best || score < best.score) best = { ...next, score };
  });
  return best;
}

function updateDetourMemory(unit, move) {
  const side = Math.sign(move.angle);
  if (move.detouring && side) {
    if (Math.sign(unit.lastMoveAngle) && side !== Math.sign(unit.lastMoveAngle)) {
      unit.oscillationFrames = Math.min(12, unit.oscillationFrames + 1);
    } else {
      unit.oscillationFrames = Math.max(0, unit.oscillationFrames - 1);
    }
    if (!unit.detourSide || unit.detourLockFrames <= 0 || unit.stalledFrames > 24) {
      unit.detourSide = side;
      unit.detourLockFrames = unit.stalledFrames > 24 ? 80 : 42;
    }
  } else if (!move.detouring && unit.stalledFrames === 0) {
    unit.detourSide = 0;
    unit.oscillationFrames = 0;
  }
  unit.detourLockFrames = Math.max(0, unit.detourLockFrames - 1);
  unit.lastMoveAngle = move.angle;
}

function movementClearance(unit, direction, speed, radius) {
  const maxSteps = 18;
  for (let step = 1; step <= maxSteps; step += 1) {
    const x = unit.x + direction.x * speed * step;
    const y = unit.y + direction.y * speed * step;
    if (collidesWithMovement(x, y, radius)) return step - 1;
  }
  return maxSteps;
}

function rotateVector(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos
  };
}

function updatePlayer() {
  let dx = 0;
  let dy = 0;
  if (state.pressedKeys.has("a") || state.pressedKeys.has("arrowleft")) dx -= 1;
  if (state.pressedKeys.has("d") || state.pressedKeys.has("arrowright")) dx += 1;
  if (state.pressedKeys.has("w") || state.pressedKeys.has("arrowup")) dy -= 1;
  if (state.pressedKeys.has("s") || state.pressedKeys.has("arrowdown")) dy += 1;
  if (!dx && !dy) return;

  const length = Math.hypot(dx, dy);
  const speed = 3.2;
  const next = {
    x: clamp(state.player.x + (dx / length) * speed, state.player.r, state.map.width - state.player.r),
    y: clamp(state.player.y + (dy / length) * speed, state.player.r, state.map.height - state.player.r)
  };

  if (collidesWithMovement(next.x, next.y, state.player.r)) {
    state.player.blocked = true;
    return;
  }
  state.player.x = next.x;
  state.player.y = next.y;
  state.player.blocked = false;
}

function collidesWithMovement(x, y, r) {
  const zoneCollision = [...state.map.collisionZones, ...state.draft.collisionZones].some((zone) => {
    if (zone.blockingType !== "movement" && zone.blockingType !== "all") return false;
    if (zone.shape === "brush") return zone.stamps.some((stamp) => distance({ x, y }, stamp) <= r + stamp.r);
    if (zone.shape === "circle") return distance({ x, y }, zone) <= r + zone.r;
    if (zone.shape === "polygon") return pointInPolygon({ x, y }, zone.points) || circleIntersectsBounds(x, y, r, polygonBounds(zone.points));
    return circleIntersectsBounds(x, y, r, zone);
  });
  if (zoneCollision) return true;
  return (state.map.objects || []).some((object) => {
    if (object.collisionMode === "none") return false;
    return assetCollisionMarks(object).some((stamp) => {
      const blockingType = stamp.blockingType || object.blockingType;
      if (blockingType !== "movement" && blockingType !== "all") return false;
      return distance({ x, y }, stamp) <= r + stamp.r;
    });
  }) || (state.simulation.shooterAssetInstances || []).some((instance) =>
    shooterAssetInstanceCollisionMarks(instance).some((stamp) => {
      const blockingType = stamp.blockingType || "movement";
      if (blockingType !== "movement" && blockingType !== "all") return false;
      return distance({ x, y }, stamp) <= r + stamp.r;
    })
  );
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function circleIntersectsBounds(x, y, r, rect) {
  const nearestX = clamp(x, rect.x, rect.x + rect.w);
  const nearestY = clamp(y, rect.y, rect.y + rect.h);
  return distance({ x, y }, { x: nearestX, y: nearestY }) <= r;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function simulateChatMapChange() {
  appendChatUserMessage("重新生成当前关卡地图，并保留当前玩法上下文");
  const input = {
    title: "Chat 地图重生成",
    summary: "左侧 Chat 请求重新生成当前地图，未应用草稿会被清空。",
    fields: [
      { label: "关卡", value: state.map.name },
      { label: "地图运动", value: state.map.motion === "scroll" ? "滚动" : "静止" },
      { label: "处理方式", value: "重置草稿并刷新地图预览" }
    ],
    payload: {
      type: "map.apply",
      editor: "map",
      source: "chat",
      mapId: state.currentMapId,
      gameType: state.gameType
    }
  };
  appendStructuredChatInput(input);
  const steps = [
    { icon: "map", label: "读取当前关卡", detail: state.map.name },
    { icon: "layers_clear", label: "清理草稿层", detail: "避免旧编辑和新地图冲突" },
    { icon: "refresh", label: "刷新预览与地图编辑", detail: "同步右侧地图编辑板块" }
  ];
  const processCard = appendAssistantProcessCard({
    title: "正在重生成地图",
    summary: "我会清空未应用草稿，并基于当前玩法重新生成地图上下文。",
    steps
  });
  runAssistantProcess(processCard, steps, () => {
    state.previewHasContent = true;
    state.map = createMapById(state.currentMapId);
    discardDraft();
    clearSelectedObject();
    resetSimulation();
    chatNotice.textContent = "Chat 已重新生成当前地图，右侧未应用草稿已自动清空。";
    renderAll();
    setView("map");
    const result = {
      title: "地图已重新生成",
      summary: "当前地图预览和地图编辑板块已刷新，可以继续添加点位、路径和区域。",
      fields: [
        { label: "状态", value: "已刷新" },
        { label: "地图", value: state.map.name },
        { label: "下一步", value: "打开地图编辑继续调整" }
      ],
      payload: {
        type: "map.result",
        accepted: true,
        source: "chat",
        mapId: state.currentMapId
      }
    };
    completeAssistantWorkCard(processCard, {
      title: result.title,
      summary: result.summary,
      elapsed: "3.4",
      resultMarkup: renderStructuredResultContent(result)
    });
    bindChatActionButtons(processCard);
  }, { totalMs: 3400 });
}

function createMapById(id) {
  const names = {
    "hulao-entry": "第1关 虎牢关入口",
    "gate-defense": "第2关 城门防线",
    "boss-camp": "第3关 Boss营地"
  };
  return createEmptyMap(id, names[id]);
}

function createEmptyMap(id, name) {
  return {
    id,
    name,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    collisionZones: [],
    paths: [],
    placementZones: [],
    points: [],
    objects: [],
    backgroundUrl: null,
    backgroundName: null,
    motion: "static",
    scrollDirection: "vertical",
    scrollSpeed: "medium"
  };
}

function handleEditStart(event, source) {
  const pos = editPoint(event, source);
  const shooterAssetInstance = hitTestShooterAssetInstance(pos);
  if (shooterAssetInstance) {
    const sourceAsset = findAsset(shooterAssetInstance.assetId);
    if (sourceAsset) {
      selectCanvasEntity("asset", sourceAsset.id);
      state.selectedShooterInstanceId = shooterAssetInstance.id;
      chatNotice.textContent = `已选中随机出现素材：${sourceAsset.name}`;
      renderAll();
      state.isDrawing = false;
      return;
    }
  }
  if (state.selectedCanvasEntity?.kind === "asset") {
    const selectedAsset = findAsset(state.selectedCanvasEntity.id);
    const handle = selectedAsset ? assetHandleAt(pos, selectedAsset) : null;
    if (handle === "delete") {
      deleteAsset(selectedAsset.id);
      state.isDrawing = false;
      return;
    }
    if (handle === "resize") {
      state.isDrawing = true;
      state.draggingAsset = {
        id: selectedAsset.id,
        mode: "resize",
        startScale: selectedAsset.scale || 1,
        startDistance: Math.max(1, distance(pos, selectedAsset)),
        startStamps: (selectedAsset.collisionStamps || []).map((stamp) => ({ ...stamp }))
      };
      return;
    }
    if (selectedAsset && pointInAsset(pos, selectedAsset)) {
      state.isDrawing = true;
      if (state.assetCollisionAction === "brush") {
        addAssetCollisionStamp(selectedAsset, pos);
        renderAll();
        return;
      }
      if (state.assetCollisionAction === "erase") {
        eraseAssetCollisionAt(selectedAsset, pos);
        renderAll();
        return;
      }
      state.draggingAsset = { id: selectedAsset.id, mode: "move", last: pos };
      return;
    }
    const nextAsset = hitTestAsset(pos);
    if (nextAsset && nextAsset.id !== selectedAsset?.id) {
      selectCanvasEntity("asset", nextAsset.id);
    } else {
      clearSelectedObject();
      renderAll();
    }
    if (state.assetCollisionAction === "brush" || state.assetCollisionAction === "erase") {
      state.isDrawing = false;
      return;
    }
    state.isDrawing = false;
    return;
  }
  const asset = hitTestAsset(pos);
  if (asset) {
    selectCanvasEntity("asset", asset.id);
    state.isDrawing = true;
    state.draggingAsset = { id: asset.id, mode: "move", last: pos };
    return;
  }
  state.isDrawing = true;
  if (state.tool === "point") {
    handlePointClick(pos);
    state.isDrawing = false;
    renderAll();
    return;
  }
  if (state.tool === "path") {
    if (!state.activeDraftPolyline) {
      const hit = findPathAt(pos);
      if (hit) {
        selectObject(hit.item.id, "paths", hit.source);
        state.isDrawing = false;
        return;
      }
    }
    addPolylinePoint(pos);
    state.isDrawing = false;
    renderAll();
    return;
  }
  if (state.tool === "area") {
    const hit = findAreaAt(pos);
    if (hit) {
      selectObject(legacyAreaGroupId(hit.item, hit.bucket, hit.source), hit.bucket, hit.source);
      state.isDrawing = false;
      return;
    }
    state.dragStart = pos;
    if (state.activeAreaAction === "brush") {
      startAreaStroke(pos);
      state.lastBrushPoint = pos;
    }
    if (state.activeAreaAction === "erase") {
      eraseAreaAt(pos);
      state.lastBrushPoint = pos;
    }
    renderAll();
    return;
  }
  state.dragStart = pos;
}

function handleEditMove(event, source) {
  if (!state.isDrawing) return;
  const pos = editPoint(event, source);
  if (state.draggingAsset) {
    const object = findAsset(state.draggingAsset.id);
    if (!object) return;
    if (state.draggingAsset.mode === "resize") {
      const nextScale = clamp(
        state.draggingAsset.startScale * (distance(pos, object) / state.draggingAsset.startDistance),
        0.2,
        4
      );
      const ratio = nextScale / state.draggingAsset.startScale;
      object.scale = nextScale;
      if (object.collisionMode === "brush") {
        object.collisionStamps = state.draggingAsset.startStamps.map((stamp) => ({
          ...stamp,
          x: object.x + (stamp.x - object.x) * ratio,
          y: object.y + (stamp.y - object.y) * ratio,
          r: stamp.r * ratio
        }));
      }
      renderAll();
      return;
    }
    const dx = pos.x - state.draggingAsset.last.x;
    const dy = pos.y - state.draggingAsset.last.y;
    object.x = clamp(object.x + dx, 0, MAP_WIDTH);
    object.y = clamp(object.y + dy, 0, MAP_HEIGHT);
    if (object.collisionMode === "brush") {
      (object.collisionStamps || []).forEach((stamp) => {
        stamp.x += dx;
        stamp.y += dy;
      });
    }
    state.draggingAsset.last = pos;
    renderAll();
    return;
  }
  if (state.selectedCanvasEntity?.kind === "asset") {
    const object = findAsset(state.selectedCanvasEntity.id);
    if (object && state.assetCollisionAction !== "move" && pointInAsset(pos, object)) {
      if (state.assetCollisionAction === "erase") eraseAssetCollisionAt(object, pos);
      else addAssetCollisionStamp(object, pos);
      renderAll();
    }
    return;
  }
  if (state.tool === "area" && state.activeAreaAction === "brush") {
    if (distance(pos, state.lastBrushPoint) >= state.brushSize * 0.28) {
      paintAreaStroke(state.lastBrushPoint, pos);
      state.lastBrushPoint = pos;
      renderAll();
    }
    return;
  }
  if (state.tool === "area" && state.activeAreaAction === "erase") {
    if (distance(pos, state.lastBrushPoint) >= state.brushSize * 0.28) {
      eraseAreaAt(pos);
      state.lastBrushPoint = pos;
      renderAll();
    }
    return;
  }
}

function handleEditEnd(event, source) {
  if (state.draggingAsset) {
    state.draggingAsset = null;
    state.isDrawing = false;
    state.dragStart = null;
    renderAll();
    return;
  }
  if (!state.dragStart && !state.isDrawing) return;
  const wasDrawing = state.isDrawing;
  state.isDrawing = false;
  const end = editPoint(event, source);
  const rect = normalizeRect(state.dragStart, end);
  if (state.tool === "area") {
    commitActiveAreaStroke();
    state.dragStart = null;
    state.lastBrushPoint = null;
    renderAll();
    return;
  }
  if (!wasDrawing || rect.w < 12 || rect.h < 12) {
    state.dragStart = null;
    return;
  }
  state.dragStart = null;
  renderAll();
}

function handlePointClick(pos) {
  const hit = findPointAt(pos);
  if (hit) {
    selectObject(hit.item.id, "points", hit.source);
    return;
  }
  const point = {
    id: nextId("point"),
    name: randomPointName(state.semanticType),
    type: state.semanticType,
    x: pos.x,
    y: pos.y
  };
  state.map.points.push(point);
  state.selectedObject = { id: point.id, bucket: "points", source: "map" };
  state.selectedPointId = point.id;
  chatNotice.textContent = `已添加${semanticLabel(point.type)}。`;
}

function randomPointName(type) {
  const labels = {
    enemy_spawn: "敌营",
    target: "终点",
    boss: "首领",
    resource: "资源",
    tower_core: "攻击目标",
    player_spawn: "玩家",
    elite_spawn: "精英",
    supply: "补给",
    respawn: "复活"
  };
  return `${labels[type] || "点位"}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function randomObjectName(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function addPolylinePoint(pos) {
  const binding = nearestRoutePoint(pos, 30);
  const routePoint = binding ? { x: binding.x, y: binding.y } : pos;
  if (!state.activeDraftPolyline) {
    state.activeDraftPolyline = {
      id: nextId("path"),
      name: randomObjectName("路线"),
      type: state.semanticType,
      width: state.pathWidth,
      drawMode: state.pathDrawMode,
      points: [],
      startPointId: binding?.id || null,
      sourceBindingKind: binding ? "point" : null,
      sourceBindingId: binding?.id || null,
      actorScope: state.semanticType === "movement_route" ? "source_all" : "player",
      assignmentMode: "all",
      loopMode: "once",
      endPointId: null,
      waypointPointIds: []
    };
  }
  state.activeDraftPolyline.points.push(routePoint);
  if (binding) {
    state.activeDraftPolyline.endPointId = binding.id;
    if (binding.type === "tower_core" && !state.activeDraftPolyline.waypointPointIds.includes(binding.id)) {
      state.activeDraftPolyline.waypointPointIds.push(binding.id);
    }
    chatNotice.textContent = `路线已绑定${semanticLabel(binding.type)}：${binding.name || fallbackPointName(binding)}`;
  }
}

function nearestRoutePoint(pos, maxDistance) {
  return [...state.map.points, ...state.draft.points]
    .map((point) => ({ point, value: distance(point, pos) }))
    .filter(({ value }) => value <= maxDistance)
    .sort((a, b) => a.value - b.value)[0]?.point || null;
}

function commitActivePolyline() {
  if (!state.activeDraftPolyline) return false;
  if (state.activeDraftPolyline.points.length < 2) {
    chatNotice.textContent = `${semanticLabel(state.activeDraftPolyline.type)}至少需要两个路线节点，请继续在地图上点击下一个位置。`;
    renderAll();
    return false;
  }
  const path = state.activeDraftPolyline;
  const firstBinding = nearestRoutePoint(path.points[0], 2);
  const lastBinding = nearestRoutePoint(path.points[path.points.length - 1], 2);
  path.startPointId = path.startPointId || firstBinding?.id || null;
  path.endPointId = lastBinding?.id || path.endPointId || null;
  state.draft.paths.push(path);
  state.draftHistory.push({ action: "add", bucket: "paths", id: path.id });
  state.draft.dirty = true;
  state.activeDraftPolyline = null;
  state.selectedObject = { id: path.id, bucket: "paths", source: "draft" };
  chatNotice.textContent = `${semanticLabel(path.type)}已完成；可在右侧配置执行来源和执行角色。`;
  renderAll();
  return true;
}

function addCollisionZone(area) {
  const zone = {
    id: nextId("collision"),
    shape: area.shape || "circle",
    ...area,
    semanticType: state.semanticType,
    blockingType: state.blockingType
  };
  state.draft.collisionZones.push(zone);
  state.draftHistory.push({ action: "add", bucket: "collisionZones", id: zone.id });
  state.draft.dirty = true;
}

function addPlacementZone(area) {
  const zone = {
    id: nextId("area"),
    shape: area.shape || "circle",
    ...area,
    areaType: state.semanticType,
    allowedTypes: placementTypes(state.semanticType)
  };
  state.draft.placementZones.push(zone);
  state.draftHistory.push({ action: "add", bucket: "placementZones", id: zone.id });
  state.draft.dirty = true;
}

function startAreaStroke(point) {
  state.activeAreaStroke = createAreaStroke();
  addAreaStrokeStamp(point);
}

function createAreaStroke() {
  const base = {
    shape: "brush",
    stamps: [],
    brushSize: state.brushSize
  };
  if (collisionSemanticType(state.semanticType)) {
    return {
      id: nextId("collision"),
      name: randomObjectName("区域"),
      ...base,
      semanticType: state.semanticType,
      blockingType: state.blockingType
    };
  }
  return {
    id: nextId("area"),
    name: randomObjectName("区域"),
    ...base,
    areaType: state.semanticType,
    allowedTypes: placementTypes(state.semanticType),
    obstacleAsset: state.semanticType === "obstacle_zone" ? state.obstacleAssetName || "默认障碍" : null,
    collisionMark: state.semanticType === "obstacle_zone" ? obstacleCollisionMark.value : null,
    movement: state.semanticType === "obstacle_zone" ? obstacleMovement.value : null,
    frequency: state.semanticType === "obstacle_zone" ? obstacleFrequency.value : null,
    collisionRule: state.semanticType === "obstacle_zone" ? obstacleCollisionRule.value : null
  };
}

function addAreaStrokeStamp(point) {
  if (!state.activeAreaStroke) state.activeAreaStroke = createAreaStroke();
  state.activeAreaStroke.stamps.push({
    x: point.x,
    y: point.y,
    r: state.brushSize / 2
  });
}

function paintAreaStroke(from, to) {
  if (!from) {
    addAreaStrokeStamp(to);
    return;
  }
  const step = Math.max(6, state.brushSize * 0.35);
  const length = distance(from, to);
  const count = Math.max(1, Math.ceil(length / step));
  for (let i = 1; i <= count; i += 1) {
    const t = i / count;
    addAreaStrokeStamp({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t
    });
  }
}

function commitActiveAreaStroke() {
  if (!state.activeAreaStroke) return;
  const stroke = state.activeAreaStroke;
  state.activeAreaStroke = null;
  if (!stroke.stamps.length) return;
  if (stroke.areaType === "obstacle_zone" && stroke.collisionMark === "auto") {
    stroke.autoCollisionStamps = generateAutoObstacleCollision(stroke);
  }
  if (collisionSemanticType(stroke.semanticType)) {
    state.draft.collisionZones.push(stroke);
    state.draftHistory.push({ action: "add", bucket: "collisionZones", id: stroke.id });
  } else {
    state.draft.placementZones.push(stroke);
    state.draftHistory.push({ action: "add", bucket: "placementZones", id: stroke.id });
  }
  state.draft.dirty = true;
}

function generateAutoObstacleCollision(zone) {
  const bounds = zoneBounds(zone);
  const source = zone.stamps || [];
  if (!source.length) return [];
  const count = Math.max(4, Math.min(18, Math.round(source.length / 3)));
  const marks = [];
  for (let i = 0; i < count; i += 1) {
    const stamp = source[Math.floor((i / count) * source.length)];
    const jitter = (zone.brushSize || 48) * 0.18;
    marks.push({
      x: clamp(stamp.x + (Math.random() - 0.5) * jitter, bounds.x, bounds.x + bounds.w),
      y: clamp(stamp.y + (Math.random() - 0.5) * jitter, bounds.y, bounds.y + bounds.h),
      r: Math.max(10, Math.min(24, stamp.r * 0.48))
    });
  }
  return marks;
}

function addInvertedCollisionZones(opening) {
  const zones = [
    { x: 0, y: 0, w: state.map.width, h: opening.y },
    { x: 0, y: opening.y + opening.h, w: state.map.width, h: state.map.height - opening.y - opening.h },
    { x: 0, y: opening.y, w: opening.x, h: opening.h },
    { x: opening.x + opening.w, y: opening.y, w: state.map.width - opening.x - opening.w, h: opening.h }
  ].filter((zone) => zone.w > 8 && zone.h > 8);
  zones.forEach((zone) => addCollisionZone(zone));
}

function eraseAreaAt(point) {
  const brush = centeredBrushRect(point);
  if (collisionSemanticType(state.semanticType)) {
    state.draft.collisionZones = state.draft.collisionZones.filter((zone) => !sameAreaType(zone) || !rectsOverlap(zoneBounds(zone), brush));
  } else {
    state.draft.placementZones = state.draft.placementZones.filter((zone) => !sameAreaType(zone) || !rectsOverlap(zoneBounds(zone), brush));
  }
  state.draftHistory.push({ action: "erase", tool: "area" });
  state.draft.dirty = hasDraftChanges();
}

function sameAreaType(zone) {
  return (zone.semanticType || zone.areaType) === state.semanticType;
}

function centeredBrushRect(point) {
  const size = state.brushSize;
  return {
    x: Math.max(0, point.x - size / 2),
    y: Math.max(0, point.y - size / 2),
    w: size,
    h: size
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function zoneBounds(zone) {
  if (zone.shape === "brush") return brushBounds(zone.stamps);
  if (zone.shape === "circle") {
    return { x: zone.x - zone.r, y: zone.y - zone.r, w: zone.r * 2, h: zone.r * 2 };
  }
  if (zone.shape === "polygon") return polygonBounds(zone.points);
  return zone;
}

function pointInZone(point, zone) {
  if (zone.shape === "brush") return zone.stamps.some((stamp) => distance(point, stamp) <= stamp.r + 4);
  if (zone.shape === "circle") return distance(point, zone) <= zone.r + 4;
  if (zone.shape === "polygon") return pointInPolygon(point, zone.points);
  const bounds = zoneBounds(zone);
  return point.x >= bounds.x && point.x <= bounds.x + bounds.w && point.y >= bounds.y && point.y <= bounds.y + bounds.h;
}

function brushBounds(stamps) {
  if (!stamps.length) return { x: 0, y: 0, w: 0, h: 0 };
  const minX = Math.min(...stamps.map((stamp) => stamp.x - stamp.r));
  const minY = Math.min(...stamps.map((stamp) => stamp.y - stamp.r));
  const maxX = Math.max(...stamps.map((stamp) => stamp.x + stamp.r));
  const maxY = Math.max(...stamps.map((stamp) => stamp.y + stamp.r));
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
}

function pointNearPath(point, path, tolerance) {
  const points = pathRoutePoints(path);
  if (points.length < 2) return false;
  for (let i = 0; i < points.length - 1; i += 1) {
    if (distanceToSegment(point, points[i], points[i + 1]) <= tolerance) return true;
  }
  return false;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return distance(point, start);
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
  return distance(point, {
    x: start.x + dx * t,
    y: start.y + dy * t
  });
}

function polygonBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    w: Math.max(...xs) - x,
    h: Math.max(...ys) - y
  };
}

function distance(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function placementTypes(value) {
  if (value === "placement_tower") return ["tower", "trap"];
  if (value === "cover_area") return ["cover"];
  if (value === "spawn_area") return ["spawn"];
  if (value === "safe_zone") return ["safe"];
  if (value === "danger_zone") return ["danger"];
  if (value === "move_area") return ["movement"];
  if (value === "combat_area") return ["combat"];
  if (value === "trigger_zone") return ["trigger"];
  if (value === "slow_zone") return ["slow"];
  if (value === "supply") return ["supply"];
  return ["tower", "trap"];
}

function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y)
  };
}

function nextId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`;
}

function isMovementKey(key) {
  return ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"].includes(key.toLowerCase());
}

function animationLoop() {
  if (state.activeView === "map") renderMap();
  renderPreview();
  window.requestAnimationFrame(animationLoop);
}

renderAssets();
renderBalance();
renderBalanceReport();
renderBalancePlans();
renderBalanceRunSummary();
updateBalanceActionState();
window.requestAnimationFrame(updateBalanceOverflowControls);
syncSemanticOptions(true);
syncScrollControls();
updateLayoutClasses();
updatePreviewZoomControls();
renderGameplayEditor();
loadGameplayKb();
renderAll();
window.requestAnimationFrame(animationLoop);
