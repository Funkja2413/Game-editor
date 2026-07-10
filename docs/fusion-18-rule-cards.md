# 18 个玩法融合方案规则卡 v0.2

## 使用流程

口径：只讨论不同玩法类型之间的融合，不包含塔防+塔防、幸存者+幸存者、Roguelite 卡牌+Roguelite 卡牌。这里按有方向的主/副玩法计算：3 个主玩法 x 2 个异类融合对象 x 每组 3 个模板 = 18 个融合方案。

固定链路：

1. 融合方案：判断是否合理、是否一句话能讲清楚。
2. 规则卡：定义用户操作、介入时机、资源、成长、风险、胜负。
3. 可执行模板规格：转成 runtime 可消费的结构化字段。
4. Runtime 行为：接输入、状态、结算、HUD、快速微调。
5. Demo 验收：验证可玩、可理解、可调参。

## 可执行模板规格字段

- `primaryLoop`：主玩法。
- `secondaryLoop`：融合玩法。
- `templateId`：融合模板 ID。
- `runtimeAdapter`：底层 runtime 类型。
- `coreAction`：用户主要操作。
- `fusionTrigger`：副玩法介入时机。
- `resourceRules`：资源获得和消耗。
- `growthRules`：成长来源、选择和叠加方式。
- `riskRules`：失败压力、代价或负反馈。
- `winLoseRules`：胜负/阶段目标。
- `tuningMapping`：快速微调映射。
- `hudMetrics`：Preview 必须显示的指标。
- `interactionStates`：关键交互状态。

## Roguelite 卡牌最小基础规则

这套基础规则只服务方向性融合验证，不追求完整商业卡池。

- 基础目标：完成 3 场连续遭遇，玩家生命归零则失败。
- 回合结构：抽牌形成手牌；每回合获得固定能量；打出卡牌后进入弃牌堆；抽牌堆为空时洗弃牌堆。
- 基础操作：能量不足或不想继续出牌时可以主动结束回合；每回合第一次主动弃牌获得 1 点能量；无法挽回时可以认输重开。
- 敌方结构：敌人每回合展示意图，包括攻击或蓄力；玩家用攻击、格挡、抽牌、回能和融合牌应对。
- 成长结构：每场胜利后选择 1 个奖励，奖励可以是新牌、遗物、路线事件或召唤/防线补强。
- 资源口径：能量决定当回合可打出的牌；牌组厚度决定关键牌出现率；奖励选择决定长期 build。
- 融合口径：其他玩法只能通过“牌的效果、奖励结构、敌方压力、HUD 指标”进入牌局，不再只贴一张说明卡。

---

# A. 塔防为主玩法

## A1. 塔防 + 幸存者

### 1. 自由英雄救火
- 一句话：塔守主路，英雄全场自由移动处理侧翼袭扰。
- 规则卡：塔防负责主路线；幸存者特性体现在自由走位、自动攻击和救场；英雄击杀给金币但不主导升级。
- 可执行模板规格：
  - `templateId`: `free_hero_rescue`
  - `runtimeAdapter`: `wave_defense.hero_free`
  - `coreAction`: 建塔、移动英雄救火
  - `fusionTrigger`: 侧翼敌人定时从场边出现
  - `resourceRules`: 主路和侧翼击杀都给金币
  - `growthRules`: 无独立升级，强调操作救场
  - `riskRules`: 侧翼兵到基地扣血
  - `tuningMapping`: 英雄=英雄生命/伤害；压力=侧翼刷新和主路敌量
  - `hudMetrics`: 基地、金币、波次、英雄血量、侧翼敌数
  - `interactionStates`: 英雄移动、建塔、升级

### 2. 包围区防守
- 一句话：基地和英雄都是失败点，玩家同时处理主路线和场外围猎。
- 规则卡：主路敌人压基地；猎手追英雄；英雄必须走位规避并反击；塔无法完全解决围猎。
- 可执行模板规格：
  - `templateId`: `surround_zone_defense`
  - `runtimeAdapter`: `wave_defense.hero_hunted`
  - `coreAction`: 建塔守路、移动英雄躲围猎
  - `fusionTrigger`: 场外追猎者持续刷出
  - `resourceRules`: 追猎者给少量金币
  - `growthRules`: 无成长奖励，强调双压力判断
  - `riskRules`: 英雄倒下或基地破坏都失败
  - `tuningMapping`: 英雄=生存容错；压力=追猎数量/速度
  - `hudMetrics`: 基地血量、英雄血量、追猎者、主路敌军
  - `interactionStates`: 英雄移动、近战交战、建塔

### 3. 经验反哺防线
- 一句话：英雄击杀拿经验，升级选择反哺塔、基地或英雄。
- 规则卡：英雄需要主动参与击杀；经验阈值限制每波成长；升级会改变塔防防线而不只是英雄变强。
- 可执行模板规格：
  - `templateId`: `hero_growth_defense`
  - `runtimeAdapter`: `wave_defense.hero_growth`
  - `coreAction`: 建塔、移动英雄、选择防线成长
  - `fusionTrigger`: 英雄击杀后掉经验
  - `resourceRules`: 击杀给金币和经验
  - `growthRules`: 每波最多一次成长，选全塔火力/基地修复/英雄伤害
  - `riskRules`: 英雄不参战则成长不足
  - `tuningMapping`: 英雄=英雄成长强度；卡牌收益=经验收益；压力=敌量
  - `hudMetrics`: 经验阈值、成长次数、基地、英雄血量
  - `interactionStates`: 经验吸附、升级选择、建塔

## A2. 塔防 + Roguelite 卡牌

### 4. 波前战术牌
- 一句话：每波前选一张战术牌，改变本波防守策略。
- 规则卡：卡牌不形成长期牌组，主要改变本波经济、防线或控场；每波选择必须影响打法。
- 可执行模板规格：
  - `templateId`: `wave_tactic_cards`
  - `runtimeAdapter`: `wave_defense.pre_wave_cards`
  - `coreAction`: 波前选牌、战中建塔
  - `fusionTrigger`: 每波开始前抽候选牌
  - `resourceRules`: 牌可给金币/击杀奖励
  - `growthRules`: 单波临时增益，无长期构筑
  - `riskRules`: 选错会造成该波短板
  - `tuningMapping`: 卡牌收益=候选数/效果强度；压力=本波敌量
  - `hudMetrics`: 候选牌数、当前战术、波次、金币
  - `interactionStates`: 波前暂停、选牌、开波

### 5. 牌组防线
- 一句话：建塔和升级来自手牌，防线随牌组循环变化。
- 规则卡：手牌包含建造、升级、经济牌；出牌后进弃牌堆；洗牌后再抽；手牌不顺会制造防线空窗。
- 可执行模板规格：
  - `templateId`: `build_cards`
  - `runtimeAdapter`: `wave_defense.deck_building`
  - `coreAction`: 选手牌、点空位/已有塔
  - `fusionTrigger`: 战斗中持续手牌操作
  - `resourceRules`: 出牌消耗金币，经济牌补资源
  - `growthRules`: 牌组循环决定建造/升级机会
  - `riskRules`: 手牌不顺和金币不足会卡操作
  - `tuningMapping`: 卡牌收益=手牌上限/牌库质量；建造=费用；资源=金币
  - `hudMetrics`: 手牌、抽牌堆、弃牌堆、金币、防御塔
  - `interactionStates`: 选牌、目标高亮、确认建造/升级

### 6. 风险契约牌
- 一句话：波前拿高收益契约，同时强化下一波敌人。
- 规则卡：收益和代价必须成对出现；风险只影响下一波或有限持续时间；玩家主动承接风险。
- 可执行模板规格：
  - `templateId`: `risk_contract`
  - `runtimeAdapter`: `wave_defense.risk_contract`
  - `coreAction`: 波前选契约、战中建塔
  - `fusionTrigger`: 每波开始前抽风险契约
  - `resourceRules`: 契约给金币、奖励、火力或分数
  - `growthRules`: 无牌组成长，强调风险层
  - `riskRules`: 敌量、血量、速度或漏怪伤害提高
  - `tuningMapping`: 卡牌收益=收益倍率/候选数；风险=敌方强化
  - `hudMetrics`: 风险层、本波强化、收益、基地
  - `interactionStates`: 风险预览、确认契约、开波

---

# B. 幸存者为主玩法

## B1. 幸存者 + 塔防

### 7. 移动炮台护圈
- 一句话：玩家自由走位，临时炮台围绕玩家形成安全圈。
- 规则卡：幸存者移动和自动攻击是主体；塔防变成可放置临时防御点；炮台有持续时间和冷却。
- 可执行模板规格：
  - `templateId`: `portable_turret_ring`
  - `runtimeAdapter`: `survival.deployable_tower`
  - `coreAction`: 走位、放置临时炮台
  - `fusionTrigger`: 能量满后可部署炮台
  - `resourceRules`: 击杀掉零件，零件用于部署
  - `growthRules`: 升级可强化炮台类型或持续时间
  - `riskRules`: 炮台位置错误会被包围
  - `tuningMapping`: 建造=部署成本；英雄=玩家强度；压力=包围密度
  - `hudMetrics`: 生命、等级、零件、炮台数、冷却
  - `interactionStates`: 选炮台、放置范围、自动攻击

### 8. 据点防守圈
- 一句话：玩家必须围绕据点生存，离开据点会失去防线支援。
- 规则卡：幸存者走位仍是主体；塔防据点提供固定火力；玩家要拉怪进火力圈。
- 可执行模板规格：
  - `templateId`: `survival_base_zone`
  - `runtimeAdapter`: `survival.defense_zone`
  - `coreAction`: 走位、拉怪、升级据点
  - `fusionTrigger`: 敌潮持续围攻据点和玩家
  - `resourceRules`: 经验升级玩家，零件升级据点
  - `growthRules`: 选玩家技能或据点火力
  - `riskRules`: 据点被破坏或玩家死亡失败
  - `tuningMapping`: 资源=零件掉落；建造=据点升级成本；压力=围攻密度
  - `hudMetrics`: 玩家生命、据点血量、经验、零件
  - `interactionStates`: 拉怪、升级选择、据点修复

### 9. 防线召唤技能
- 一句话：塔防作为主动技能出现，玩家短时间召唤箭雨、路障或塔阵。
- 规则卡：幸存者主体不变；塔防元素变成技能池；升级让玩家选择防线技能流派。
- 可执行模板规格：
  - `templateId`: `tower_skill_loadout`
  - `runtimeAdapter`: `survival.tower_skills`
  - `coreAction`: 走位、释放防线技能
  - `fusionTrigger`: 技能冷却完成或击杀充能
  - `resourceRules`: 击杀充能，升级解锁技能
  - `growthRules`: 技能升级分为箭雨/路障/炮塔
  - `riskRules`: 技能空窗期压力升高
  - `tuningMapping`: 卡牌收益=技能充能/效果；压力=敌量；英雄=玩家能力
  - `hudMetrics`: 技能冷却、经验、生命、敌群密度
  - `interactionStates`: 技能选择、释放范围、冷却

## B2. 幸存者 + Roguelite 卡牌

### 10. 实时抽牌技能流
- 一句话：卡牌作为主动技能，战斗中抽牌、出牌、弃牌、洗牌。
- 规则卡：击杀补能量；卡牌释放清场、保命或控场；手牌和能量决定操作节奏。
- 可执行模板规格：
  - `templateId`: `cards_as_active_skills`
  - `runtimeAdapter`: `survival.realtime_deck`
  - `coreAction`: 走位、出技能牌
  - `fusionTrigger`: 定时抽牌和击杀补能
  - `resourceRules`: 能量由击杀获得
  - `growthRules`: 保留幸存者升级，卡牌不在升级时构筑
  - `riskRules`: 能量不足和手牌满造成空窗
  - `tuningMapping`: 卡牌收益=手牌/抽牌/卡强/费用；风险=无
  - `hudMetrics`: 生命、经验、手牌、能量、抽牌堆、弃牌堆
  - `interactionStates`: 可出牌、能量不足、弃牌洗牌

### 11. 升级构筑牌组
- 一句话：每次升级同时选英雄成长和牌组构筑目标。
- 规则卡：幸存者升级保留；玩家先选构筑动作，再选具体卡；牌组会长期影响战斗。
- 可执行模板规格：
  - `templateId`: `cards_as_growth_choices`
  - `runtimeAdapter`: `survival.level_deck_build`
  - `coreAction`: 走位、升级、构筑牌组
  - `fusionTrigger`: 升级时打开双层选择
  - `resourceRules`: 击杀给经验和能量
  - `growthRules`: 英雄成长 + 加牌/升牌/删牌
  - `riskRules`: 牌组臃肿降低关键牌出现率
  - `tuningMapping`: 卡牌收益=候选数/牌强/抽牌频率；英雄=基础战力
  - `hudMetrics`: 等级、经验、牌库、弃牌、构筑选择
  - `interactionStates`: 选成长、选构筑动作、选目标卡

### 12. 风险事件牌
- 一句话：战斗中主动拿高收益事件，同时叠加敌潮压力。
- 规则卡：事件不是普通技能牌；每次承接都会提高收益和风险层数。
- 可执行模板规格：
  - `templateId`: `risk_event_cards`
  - `runtimeAdapter`: `survival.risk_events`
  - `coreAction`: 走位、选择风险事件
  - `fusionTrigger`: 战斗中随时点击事件牌
  - `resourceRules`: 事件给经验、分数、治疗或强化牌
  - `growthRules`: 事件收益加速升级或构筑
  - `riskRules`: 风险层提高敌血、速度、额外刷怪
  - `tuningMapping`: 卡牌收益=事件数/收益；风险=惩罚强度
  - `hudMetrics`: 风险层、额外刷怪、生命、经验、击杀
  - `interactionStates`: 风险预览、承接事件、风险叠层

---

# C. Roguelite 卡牌为主玩法

## C1. Roguelite 卡牌 + 塔防

### 13. 牌局建防线
- 一句话：卡牌回合内出牌建造防线，敌人在回合结束后推进。
- 规则卡：主体验是卡牌资源和手牌决策；塔防表现为场上路径、塔和敌人推进。
- 可执行模板规格：
  - `templateId`: `turn_card_build_defense`
  - `runtimeAdapter`: `deck_builder.tower_board`
  - `coreAction`: 出牌建塔/升级/阻挡
  - `fusionTrigger`: 每回合敌人沿路线推进
  - `resourceRules`: 能量出牌，金币作为塔费用
  - `growthRules`: 战斗胜利选新塔牌
  - `riskRules`: 回合结束敌人推进，漏怪扣基地
  - `tuningMapping`: 卡牌收益=抽牌/奖励牌；建造=塔牌费用；压力=敌推进
  - `hudMetrics`: 手牌、能量、基地、敌人进度、牌库
  - `interactionStates`: 出牌、选目标格、回合结束

### 14. 防线遗物
- 一句话：卡牌战斗胜利后获得塔防遗物，遗物自动影响后续牌局。
- 规则卡：主玩法仍是卡牌战斗；塔防作为遗物系统提供自动火力、防御或阻挡。
- 可执行模板规格：
  - `templateId`: `tower_relic_deck`
  - `runtimeAdapter`: `deck_builder.relic_defense`
  - `coreAction`: 出牌战斗、选择遗物
  - `fusionTrigger`: 每场胜利后选塔防遗物
  - `resourceRules`: 能量出牌，无金币或少量金币
  - `growthRules`: 遗物叠加形成防线 build
  - `riskRules`: 敌人意图增强，遗物不足会被击穿
  - `tuningMapping`: 卡牌收益=奖励牌/遗物强度；压力=敌意图数值
  - `hudMetrics`: 遗物、手牌、能量、敌意图、生命
  - `interactionStates`: 出牌、选奖励、选遗物

### 15. 路线事件牌
- 一句话：卡牌旅程地图变成路线防守事件，玩家在节点间选择风险路线。
- 规则卡：主玩法是 Roguelite 节点选择和牌组成长；塔防表现为节点战斗的路线压力。
- 可执行模板规格：
  - `templateId`: `route_event_defense`
  - `runtimeAdapter`: `deck_builder.map_route_defense`
  - `coreAction`: 选路线节点、打牌解决事件
  - `fusionTrigger`: 节点进入小型防守牌局
  - `resourceRules`: 生命、金币、牌库奖励
  - `growthRules`: 通过节点拿牌、删牌、升级
  - `riskRules`: 高收益路线有更强敌潮
  - `tuningMapping`: 卡牌收益=奖励质量；风险=路线事件压力
  - `hudMetrics`: 节点、生命、金币、牌组、敌潮
  - `interactionStates`: 选节点、出牌、结算奖励

## C2. Roguelite 卡牌 + 幸存者

### 16. 自动战斗牌组
- 一句话：角色自动战斗，玩家用牌改变武器、范围和走位策略。
- 规则卡：主玩法是手牌和能量；幸存者提供实时敌潮和自动攻击目标。
- 可执行模板规格：
  - `templateId`: `deck_controls_survivor`
  - `runtimeAdapter`: `deck_builder.realtime_survival`
  - `coreAction`: 出牌改变实时战斗状态
  - `fusionTrigger`: 每回合或定时刷新敌潮
  - `resourceRules`: 能量出牌，击杀给金币或抽牌
  - `growthRules`: 胜利后加牌升级牌
  - `riskRules`: 敌潮实时逼近，拖慢会掉血
  - `tuningMapping`: 卡牌收益=抽牌/牌强；压力=敌潮；英雄=角色属性
  - `hudMetrics`: 手牌、能量、生命、敌潮、牌库
  - `interactionStates`: 出牌、实时结算、抽弃牌

### 17. 生存回合牌局
- 一句话：每回合打牌决定下一段生存的武器和规则。
- 规则卡：卡牌决策发生在短暂停顿中；之后进入自动生存片段检验选择。
- 可执行模板规格：
  - `templateId`: `round_plan_survival`
  - `runtimeAdapter`: `deck_builder.plan_then_survive`
  - `coreAction`: 回合前出牌配置下一段战斗
  - `fusionTrigger`: 每 20 秒进入一次规划回合
  - `resourceRules`: 能量出牌，击杀给下回合资源
  - `growthRules`: 每段结束选奖励牌
  - `riskRules`: 规划不足会在生存段被围死
  - `tuningMapping`: 卡牌收益=规划牌数/效果；压力=生存段敌潮
  - `hudMetrics`: 当前规划、倒计时、手牌、生命、击杀
  - `interactionStates`: 规划暂停、自动生存、结算

### 18. 牌组召唤流
- 一句话：牌不是直接攻击，而是召唤随从和武器围绕角色作战。
- 规则卡：卡牌构筑决定召唤池；幸存者实时场景检验召唤阵容。
- 可执行模板规格：
  - `templateId`: `deck_summon_survival`
  - `runtimeAdapter`: `deck_builder.summon_arena`
  - `coreAction`: 出牌召唤/强化随从
  - `fusionTrigger`: 出牌后随从进入场上自动战斗
  - `resourceRules`: 能量出牌，击杀触发抽牌
  - `growthRules`: 奖励牌扩充召唤类型
  - `riskRules`: 随从阵容不成型会被包围
  - `tuningMapping`: 卡牌收益=召唤牌质量/抽牌；英雄=角色保命
  - `hudMetrics`: 随从数、手牌、能量、生命、敌群
  - `interactionStates`: 召唤、强化、随从跟随

---

# 审阅建议

建议先审这 4 类问题：

1. 哪些融合方案不合理，直接删除。
2. 哪些方案名字不够直观，需要换标题。
3. 哪些方案的一句话解释不能让用户立刻理解。
4. 哪些方案值得进入第一批 demo，实现优先级最高。

确认后进入下一步：

`规则卡 -> 可执行模板规格 JSON -> runtime adapter -> demo 验收`
