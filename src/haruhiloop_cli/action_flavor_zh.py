"""行动纯叙事反馈（与数值/事件判定无关）。常规文案；伪随机 + 同动作禁止三连相同。

特殊池：群像碎片（人名｜极短句）；长门/朝比奈台词块；阿虚「」独白（见备忘）。
常规池在累计动作>1 步后，可有各 1% 佐佐木/朝比奈（大）单行覆盖（哈希决定）。"""

from __future__ import annotations

import hashlib
import random

from haruhiloop_cli import rules
from haruhiloop_cli.models import GameState

# —— 群像瞬间：真结局跑道 / 共识与切口邻近 / 闭锁与暴晒邻域 / 终盘 ——（优先级最高）
ACTION_IDS_ENSEMBLE_BURST = frozenset(rules.ORDERED_ACTION_IDS)
ENSEMBLE_BURST_STREAK_KEY = "__ensemble_burst__"

_ENSEMBLE_BURST_VARIANTS: tuple[str, ...] = (
    """春日｜就现在。抬手。
长门｜阈边。别催。
朝比奈｜杯沿在抖——同一圈。
古泉｜一秒。笑一秒就收。
阿虚｜够了。听。""",
    """春日｜把那行删掉。重写。
长门｜第三盏灯。记住。
朝比奈｜我数到二停三次了。
古泉｜拍子乱了也得假装齐。
阿虚｜谁在幕后拿剧本。""",
    """春日｜惊喜要炸，不要温。
长门｜噪声对齐。还差一格。
朝比奈｜对不起话音叠在一起。
古泉｜咽下去。不咽会穿帮。
阿虚｜吞咽声比谁都大。""",
    """春日｜别挡光。我看不见终点。
长门｜走廊尽头有回声。
朝比奈｜回声里也有我的名字。
古泉｜那就当合唱。我来垫。
阿虚｜垫音也是假的。""",
    """春日｜站回来。队列。
长门｜队列会折。
朝比奈｜折痕和上次一样。
古泉｜一样就对了。吓人好玩。
阿虚｜一点都不好玩。""",
)


def _category_count(state: GameState, category_id: str) -> int:
    return state.category_counts.get(category_id, 0)


def _ensemble_burst_active(state: GameState) -> bool:
    """终盘 / 关键节点：与 rules.evaluate_ending 若干邻域对齐的叙事触发（非结局判定）。"""
    if state.is_finished:
        return False
    f = state.flags
    # 晴空真结局「haruhi_happy_new_world」跑道上（金旗 + 类别与数值近阈值）
    if (
        {"festival_plan", "homework_done", "truth_shared"}.issubset(f)
        and state.satisfaction >= 76
        and state.crew_sync >= 60
        and state.clue_points >= 8
        and _category_count(state, "breakthrough") >= 2
        and _category_count(state, "coordination") >= 1
    ):
        return True
    # 「consensus_paradise」邻近
    if (
        {"hope_signal", "truth_shared", "homework_done"}.issubset(f)
        and state.satisfaction >= 65
        and state.stability >= 50
        and state.clue_points >= 8
        and _category_count(state, "coordination") >= 2
    ):
        return True
    # 「kyon_breaks_loop」邻近
    if (
        {"anomaly_seen", "homework_done", "truth_shared"}.issubset(f)
        and state.clue_points >= 11
        and _category_count(state, "investigation") >= 2
        and _category_count(state, "coordination") >= 1
        and state.stability >= 44
    ):
        return True
    if state.closed_space_stage >= 2:
        return True
    # 「meltdown_pact」邻域感：真相已同步、闭锁已发生、稳定见底
    if (
        "truth_shared" in f
        and state.stability <= 24
        and state.satisfaction >= 36
        and state.closed_space_count >= 1
    ):
        return True
    # 终盘日感：揭示 + 作业闭环后仍拖着高协同
    if (
        state.day >= 12
        and "truth_shared" in f
        and "homework_done" in f
        and state.crew_sync >= 52
    ):
        return True
    return False


# 长门疲劳 ≥ 此阈值时，核对/借资料使用特殊池（与结局阈值 96 区分）。
ACTION_FLAVOR_FATIGUE_THRESHOLD = 80
ACTION_IDS_NAGATO_FATIGUE_FLAVOR = frozenset({"向长门核对异常", "向长门借资料"})
_FLAVOR_STREAK_SUFFIX_FATIGUE = "::nagato_fatigue"

_NAGATO_FATIGUE_FLAVOR_VARIANTS: tuple[str, ...] = (
    """长门：不对。
长门：别催。同一行让我看全。
长门：日期写这里。你等我说完再插话。""",
    """长门：别动。纸给我。
长门：裂了。重印。
长门：我不想讲第二遍。
长门：今天就到这里。再多我会错。""",
    """长门：我听见了。我慢。
长门：够了。不是你不清楚，我跟不上。
长门：便签我改过。别看花眼。""",
    """长门：别一次全拿走。
长门：不是清单太多。是我今天拿不稳。
长门：重的别先扛。先这些。
长门：签。别聊天。""",
    """长门：不用休息。
长门：等一下。十秒。
长门：十秒到了。
长门：拿走。文件名别改。我不想返工。""",
)

ACTION_FLAVOR_VARIANTS_FATIGUE: dict[str, tuple[str, ...]] = {
    "向长门核对异常": _NAGATO_FATIGUE_FLAVOR_VARIANTS,
    "向长门借资料": _NAGATO_FATIGUE_FLAVOR_VARIANTS,
}

# 朝比奈临界：仅「社团活动」。协同过低或世界线偏移过高时，感官重复压到台面上。
ACTION_ID_MIKURU_CRITICAL_FLAVOR = "社团活动"
ACTION_FLAVOR_MIKURU_CREW_SYNC_MAX = 40
ACTION_FLAVOR_MIKURU_WORLDLINE_SHIFT_MIN = 58
_FLAVOR_STREAK_SUFFIX_MIKURU = "::mikuru_critical"

_MIKURU_CRITICAL_VARIANTS: tuple[str, ...] = (
    """朝比奈：我、我分不清了。
朝比奈：昨天倒的茶，和今天倒的茶。味道一样。
朝比奈：连茶叶梗立起来的角度都一样。""",
    """朝比奈：对不起。我刚才那句话，我是不是上次也说过。
朝比奈：不是故意重复。是嘴里自己跑出来。
朝比奈：你们笑一下好不好。笑一下我才能确认不是回放。""",
    """朝比奈：纸杯我又拿成同一个颜色了。
朝比奈：对不起对不起。可货架上只有这一种。
朝比奈：我是不是连选错的选项都在重复。""",
    """朝比奈：我数到三。三。二。
朝比奈：我上次是不是也停在二。
朝比奈：不要让我去对时间。我会哭出来。""",
    """朝比奈：茶又溢出来了。溢在同一条边。
朝比奈：我擦了。干了。可印子还在。
朝比奈：这算没用吗。""",
)

ACTION_FLAVOR_VARIANTS_MIKURU: dict[str, tuple[str, ...]] = {
    "社团活动": _MIKURU_CRITICAL_VARIANTS,
}


def _mikuru_critical(state: GameState) -> bool:
    return (
        state.crew_sync <= ACTION_FLAVOR_MIKURU_CREW_SYNC_MAX
        or state.worldline_shift >= ACTION_FLAVOR_MIKURU_WORLDLINE_SHIFT_MIN
    )


# 阿虚内心崩溃：8 动作皆可；在长门疲劳池、朝比奈临界池之后判定。
ACTION_IDS_KYON_COLLAPSE = frozenset(rules.ORDERED_ACTION_IDS)
_FLAVOR_STREAK_SUFFIX_KYON_TIER = "::kyon_collapse_{}"  # .format(tier)


def _kyon_collapse_pressure(state: GameState) -> int:
    """综合压力 0–120，数值越高越接近「摆烂」档文案。"""
    p = 0
    p += max(0, 58 - state.stability)
    p += max(0, 58 - state.satisfaction)
    p += state.worldline_shift // 2
    p += state.nagato_fatigue // 2
    p += state.homework_progress * 10
    p += max(0, 48 - state.crew_sync)
    return min(120, p)


# 达到后才用内心独白池（默认开局压力低，仍走常规叙事；阈值愈高则「」独白愈少见）。
ACTION_FLAVOR_KYON_PRESSURE_MIN = 46
# 分档：自我怀疑 / 自我厌恶 / 彻底摆烂（边界可依反馈再调）。
ACTION_FLAVOR_KYON_TIER1_MAX = 56
ACTION_FLAVOR_KYON_TIER2_MAX = 78


def _kyon_collapse_active(state: GameState) -> bool:
    return _kyon_collapse_pressure(state) >= ACTION_FLAVOR_KYON_PRESSURE_MIN


def _kyon_collapse_tier(state: GameState) -> int:
    p = _kyon_collapse_pressure(state)
    if p < ACTION_FLAVOR_KYON_TIER1_MAX:
        return 0
    if p < ACTION_FLAVOR_KYON_TIER2_MAX:
        return 1
    return 2


def _kyon_inner_pool_coinflip_inner(state: GameState, action_id: str, step_number: int) -> bool:
    """压力已达阈值时：True=用阿虚「」池，False=仍走该动作常规 10 条（各约 50%，哈希可复现）。"""
    parts = [state.run_id, str(step_number), action_id, "kyon_inner_vs_normal"]
    if state.random_seed is not None:
        parts.append(str(state.random_seed))
    digest = hashlib.sha256("\0".join(parts).encode("utf-8")).digest()
    return (int.from_bytes(digest[:8], "little") & 1) == 0


_KYON_COLLAPSE_TIER0: tuple[str, ...] = (
    "「我到底在干什么。作业。社团。长门。春日。作业。社团。长门。春日。」",
    "「认真想一下，哪一件是我自己想做的。想完还是不知道。」",
    "「是不是警觉得太早了，还是太晚——这种问题问自己也答不上来。」",
    "「操场、教室、活动室，三条线我都在走，走久了像同一条路。」",
    "「明天会和今天不一样吗。我不敢押，又忍不住押。」",
)
_KYON_COLLAPSE_TIER1: tuple[str, ...] = (
    "「讨厌这副还在排日程的表情——对着镜子也装不下去。」",
    "「我在讨好所有人，最后还觉得自己很辛苦。这算什么。」",
    "「理智派？笑话。我只是在逃，逃得很有条理而已。」",
    "「作业写不完就想怪世界线——逊爆了，可脑子里第一个念头还是它。」",
    "「春日烦，长门累，朝比奈慌，古泉笑——我也不是什么好东西。」",
)
_KYON_COLLAPSE_TIER2: tuple[str, ...] = (
    "「随便吧。交了就行。没交也行。反正还会再来。」",
    "「脑袋放空。剩下的交给明天那个我——他比较耐操。」",
    "「不想劝了，不想追了，不想想了。今天先到这儿。」",
    "「爱循环就循环，我当观众。票钱算我赊着。」",
    "「躺平。椅子不错。世界线爱歪就歪。」",
)

_KYON_COLLAPSE_BY_TIER: tuple[tuple[str, ...], ...] = (
    _KYON_COLLAPSE_TIER0,
    _KYON_COLLAPSE_TIER1,
    _KYON_COLLAPSE_TIER2,
)


# 与 rules.ACTIONS 键一致；每动作 10 条。
ACTION_FLAVOR_VARIANTS: dict[str, tuple[str, ...]] = {
    "老实上课": (
        """数学老师写板书，写到一半突然问：「上节课留的那题谁做了？」
你其实没做，但把手举到一半又放下，装作在找笔。
前排女生后颈有个红疙瘩，你盯了两秒才反应过来那是蚊子包。""",
        """这节课就是抄笔记。你抄到第三行开始走神：昨晚新闻里主持人把地名念错了。
回过神来时，笔记本上已经多了一行莫名其妙的词：「八月」。
你用橡皮擦掉，橡皮屑没扫，留在桌上。""",
        """英语老师在讲从句，你在下面用手机查单词，信号一格一格跳。
同桌用胳膊肘顶你：「老师看你。」
你把手机塞进裤袋，拉链硌到大腿内侧，疼了一下。""",
        """午休铃响前五分钟，教室里已经有人收拾书包，拉链声此起彼伏。
你不动，想把这一页写完，结果越写越乱，干脆折角。
折角折得太狠，纸裂了一道小口。""",
        """班会课点名。你答「到」。
班长念下一个名字，念错了音，全班笑了一声，又立刻收住。
你也笑，笑完觉得自己笑得很假。""",
        """自习课。你什么都不想干，盯着黑板槽里的粉笔头数：七根。
数到第八根时发现自己数重了。
你把脸埋进臂弯里眯了一会儿，醒来口水差点流出来。""",
        """放学值日。你拖地，拖把杆松了，拧了两圈才拧紧。
走廊灯坏了一盏，闪两下又亮。
你不想多想，继续拖。""",
        """补课。老师发卷子，纸边划到你手背，留下一条白印。
你写名字学号，写到学号第二位写错，涂黑，旁边老师啧了一声。
你重写一遍，字比第一遍丑。""",
        """体育课改成室内自习。窗外下雨，雨点打在空调外机上，节奏很固定。
你背课文，背到一半忘了下一句，卡在那里。
旁边人小声提示，你点头，继续背，背完也不记得自己背了什么。""",
        """最后一节课下课，你把课本合上，发现里面夹着一张不属于你的便签。
上面写着一个电话号码，字迹陌生。
你把便签夹回去，决定当没看见。""",
    ),
    "社团活动": (
        """春日把白板擦干净了，又立刻写满，写满又嫌丑，要你擦掉重来。
你刚擦两下，她说：「停，还是刚才那版好。」
古泉在旁边笑，笑得很轻，像在给别人台阶。""",
        """讨论摊位。朝比奈把「刨冰」听成「报纸」，订了一叠样品纸过来。
没人当场骂她，春日只盯着那叠纸看了三秒，说：「也行，改行为艺术。」
你把「刨冰」两个字用红笔圈出来，贴在墙上当提醒。""",
        """古泉和春日在预算上争了一句，语气硬了半拍。
春日说：「你笑得不真诚。」古泉说：「那我严肃点？」
两人同时停住，像都意识到再往下说会难看。你趁机把话题拽回「物料清单」。""",
        """你去仓库搬桌子，桌腿刮门槛，发出一声很难听的摩擦。
长门站在门边帮你抬另一头，她没说话，只点头示意可以进。
你把桌子放下时砸到脚尖，骂了一声，骂完才想起来朝比奈在旁边。""",
        """春日突然要你当场想三个「绝对惊喜」的点子。
你想了一个很土，她自己都嫌弃，却还是要你写下来。
你写的时候手很酸，字迹越写越飘。""",
        """打印店打电话说横幅字号太小，印出来会糊。
你拿着手机复述给对方听，对方反问：「你们到底要多大？」
你转头问春日，春日反问：「你觉得要多大？」你差点把手机捏出声。""",
        """分工表上，古泉把自己写在「机动」，春日用红笔改成「不许滑水」。
古泉没反驳，只在旁边写了个括号：（尽量）。
你把括号擦掉，又写回去——因为你也不知道该站谁。""",
        """试贴海报，胶带粘到头发，朝比奈小声叫了一下。
春日说：「别叫，像恐怖片。」
你把胶带剪断，递给她湿巾，她擦了半天还是粘。""",
        """散场前清点：剪刀少一把。
全活动室找，最后在垃圾桶边找到，刃口缠着胶带。
没人承认是谁丢的，春日说：「算了，再买。」你记进「损耗」。""",
        """锁门。你转钥匙两次才确认锁上。
楼道灯忽明忽暗，你站在门口等春日发完最后一条消息。
她抬头说：「走啊。」你说：「我在等你按发送。」她说：「我已经发了。」""",
    ),
    "向长门核对异常": (
        """你把时间表摊开，指出重复的两格。
她看了一眼，把书翻到某一页，折角里夹着便签。
我看了，是上周三的日期。她点头：「同一格。」""",
        """旧校舍楼梯口霉味很重。
我把违和点说完，她只回：「广播室。先去。」
没有解释。我跟着走。""",
        """雨声很密。她把伞骨收了一下，水溅到我鞋面。
我说对不起，她说：「不是道歉的问题。」
然后她把手机递给我：「你看通知栏，时间戳。」""",
        """两张校刊目录对齐。她用指甲划过同一栏标题。
纸边起毛。
我没接话。她抬头：「继续。」""",
        """我把疑问列到第七条，卡住。
她写：「缺对照样本。」
我去翻包，发现样本拿错了。她没骂我，只说：「回去换。」""",
        """图书馆角落。她把编号写到 7，停住。
我问是不是不确定，她说：「确定。不确定的是你怎么问。」
我闭嘴三秒，把问题重写成更短的句子。""",
        """录音笔我没开。
她确认红灯没亮，才开口：「重复不是错觉。」
下一句更短：「是结构。」我记下两个字，手有点抖。""",
        """我问她：「最先变的是哪里？」
她指太阳穴，又指操场。
我问顺序，她说：「没有顺序。只有优先级。」""",
        """票根日期很浅。她用铅笔描数字，铅笔尖啪地轻响，断了一小截。
她换一支笔继续描。
我在旁边数自己的呼吸，数到七就停。""",
        """我说：「给我一句确定。」
她说：「不一致存在。」
我又问：「那我们呢？」她没回答，开始收拾书。""",
    ),
    "向长门借资料": (
        """借阅清单递过去。她抽出复印件，用长尾夹夹好。
你数了两遍页码，末页缺角，她另抽一张补上。
登记本转过来：签时间和用途。""",
        """流程表备份整册递过来，夹页里写注意事项，字很密。
你说看不完，她只说：全量才不容易漏。
你签字，手酸。""",
        """闭馆前五分钟她把书抱来，沉。
便签红的是时间，蓝的是人名。你说懂了，她还是把便签顺序理了一遍。""",
        """复印机卡纸。她开盖把纸屑捏出来丢桶里。
再印还卡。她说：换一台。
你换机印完回去，她已把原件按顺序排好。""",
        """发票、收据、报名表。她用回形针分类，角上写日期起止。
问能不能少给点：不行。
你签字。""",
        """U 盘外壳贴标签：备份_只读。她说文件名别改。
杀毒扫描很慢，你就站着等进度条。""",
        """雨天她给文件夹套塑料袋，胶带封边。
你说谢谢，她回：别潮。
没多说。""",
        """剪报册厚，她用指尖点两处标题让你对比。
油墨味冲。你说行，她把册子合上。""",
        """补一页复印件，她叫你自己去自助机印。
后面有人催你快点。
印完回来，她把原件码齐。""",
        """归还期限她写：尽快。你说可能做不到，她说：那就分批。
你把「分批」两个字圈起来。""",
    ),
    "策划惊喜活动": (
        """春日写「惊喜」两个字太用力，纸戳破了。
我用胶带补，她说：「丑。」
我说：「丑也比漏风好。」她瞪我，但没撕。""",
        """古泉算体积，春日嫌他慢：「你能不能别像推销员。」
古泉收起笑：「那我不说话了。」
空气硬了一秒，我立刻把话题拉回「气球数量」。""",
        """朝比奈把「星」印成「腥」，样品刚送来。
春日盯着那个字，突然笑出声，笑得很尖。
我说重印要加钱，春日说：「那就腥吧，反正夏天。」""",
        """卷尺拉到头弹回来，打到我手背，红了一条。
我骂脏话，骂完朝比奈缩了一下。
春日说：「继续量，别矫情。」""",
        """流程表第三版还是对不齐。我把四段时间轴用颜色分开。
春日盯着「高潮」两个字很久，说：「这里要狠。」
古泉插话：「狠可以，别违法。」春日回：「你很烦。」""",
        """采买清单写到最后，发现预算少算一项胶水。
春日说：「从零食里扣。」
没人同意，但也没人反对，最后我写：「待定」。""",
        """海报标题上移半行，我撕了重贴，手背粘满胶。
春日退后看，说：「还是歪。」
我说：「那你来。」她说：「我不来。」""",
        """应急栏写「下雨」。春日又加一条：「春日心情不好」。
我写不下去，说：「这条没法执行。」
她把笔抢过去写：「执行：阿虚负责。」""",
        """抽奖箱摇起来沙沙响。朝比奈多塞了一张空白奖券进去，她自己没发现。
我看见了，没说。
心想：要是有人抽到空白，算谁的。""",
        """锁门。钥匙转两圈。
春日突然问：「你是不是觉得我很麻烦？」
我想说不是，张嘴变成：「麻烦也得做。」她愣住，然后踢了一下门框。""",
    ),
    "完成暑假作业": (
        """从最短的一栏开始勾题号。
写到第二题就卡，草稿纸一团团揉掉，垃圾桶很快满了。
我不倒，怕一倒就更想逃。""",
        """作文第二段删掉重写，纸面凹痕叠凹痕。
写到后来手指发麻，字迹像别人的。
我停了一会儿，去洗把脸，水很凉。""",
        """附件对齐，订书机歪了，拆掉重来，第二次还是歪。
我不管了，直接交那版。
标签上名字写得很工整，像在给丑东西化妆。""",
        """计算器按错一次，清屏重来。
茶凉了，我端起来喝一口，苦。
继续算，算到后面已经不想知道自己在算什么。""",
        """抄写类作业写到手腕发抖，行距还是歪。
页码写错，涂黑，旁边多了一块难看的疤。
我盯着那块疤看了很久。""",
        """拍照留底，闪光灯忘了关，闪到自己眼瞎一秒。
文件夹命名手滑打成「作页」。
我改回来，心里骂自己。""",
        """书包检查三遍：本、卡、笔。
拉链拉到头又拉回一点，还是鼓。
我硬塞进去，像跟包打架。""",
        """厨房桌上写，油味和墨水味混在一起。
妈妈说：「先吃饭。」我说：「等这行。」
结果那行写了二十分钟。""",
        """易错题贴墙上，胶带贴歪，越贴越歪。
我干脆撕了，揉成团丢进垃圾桶。
墙皮被撕掉一点点，白得刺眼。""",
        """排队交作业，队伍很慢。
轮到我放下本子，手心全是汗，纸角潮了。
老师抬头看我一眼，没说什么，只让我在登记表最后一格签字——我签得很大，像怕自己被漏掉。""",
    ),
    "同步循环真相": (
        """门关上。我开口第一句就咬到舌头，停了两秒。
春日说：「你到底说不说？」
我把对照表摊开，手在抖，纸哗啦响。""",
        """我说「循环」。空调停了半秒又启动，声音很突兀。
朝比奈小声问：「所以不是记错吗？」
没人回答她。沉默长得不像话。""",
        """春日盯着证据，突然笑了一声。笑完脸色更冷：「你在开玩笑吧。」
我说不是玩笑。她走近一步：「那你证明你不是在耍我。」
我嗓子发干，证明的话卡在喉咙里。""",
        """古泉想插话缓和，春日直接打断：「你先闭嘴。」
古泉真的闭了嘴，场面更难看。
长门一直看纸，像在看逃生路线。""",
        """我把时间轴画出来，红笔标锚点。
春日指着其中一个：「我明明做了不同选择。」
我提高声音：「结果还是一样——」话出口我就后悔，太像吵架。""",
        """朝比奈突然站起来又坐下，椅子刮地，刺耳。
她说：「我想去洗手间。」
春日说：「不许走。」朝比奈又坐下，手指攥着裙角。""",
        """我承认：「我也怀疑过自己疯了。」
这句话说出来，房间里反而松了一点。
下一秒春日说：「那你现在是在拉我们一起疯？」我接不上。""",
        """我让每人复述三十秒。古泉说得很圆，圆得像敷衍。
春日听完说：「你讲得像我爸开会。」
古泉脸色变了一下，没回嘴。""",
        """我说风险：「知道以后更累，也可能更危险。」
春日走到窗边，一把拉开窗帘，光涌进来，刺得我眯眼。
她又拉上，说：「那你凭什么替我决定要不要知道。」""",
        """散会时我让大家分批走。
最后只剩我和春日，她盯着我：「你刚才那句‘结果还是一样’，你是怪我？」
我想说不是，张嘴变成沉默。她转身先走，脚步声很重。""",
    ),
    "安抚春日": (
        """她一脚踢开椅子，声音很响。
我说：「外面吵，我听不清。」
她骂我装，但音量确实下来了。""",
        """她把传单揉成团丢进纸篓。
我去捡，说重做比吵架快。
她抢过去自己粘，粘得歪，她说：「你看，这就是你惹我。」""",
        """她说无聊到要炸。
我顺口回：「那你去跑步。」
话一出口我就知道自己完了。她盯着我：「你说什么？」我闭嘴，已经晚了。""",
        """沉默太久，她吼：「你倒是说话啊！」
我说：「我在想怎么说才不会更糟。」
她冷笑：「你已经更糟了。」我把水递过去，瓶盖拧开，她没接。""",
        """我改口：「无聊是真的。」
把便签给她勾，她勾最短那条，又划掉改最长那条，又改回最短。
我说：「你选一个就行。」她说：「我全都要。」""",
        """走廊有人探头，我挡门。
她问干嘛，我说给你十秒骂完。
她骂到第八秒开始笑，笑到第十秒又停，像断电。""",
        """她把手机扣桌上。
我说关通知半小时，她做了，做完又说：「你是不是觉得我很好哄。」
我说：「没有，我只是怕你更烦。」""",
        """她说要走。我说陪你到车站。
她走一半停住踢石子：「你很烦。」
我说：「嗯。」她又走两步，回头：「你跟上啊。」""",
        """她眼睛红，不承认。
我把纸巾推过去，不看她：「擦完把事做完。」
她抽纸，攥成团，丢进我怀里：「你也擦，你脸上全是汗。」""",
        """我把目标缩成一句：「这一页做完就算赢。」
她翻白眼，还是翻开。
我在页角画小勾，她用笔把它涂掉，又自己画了一个更大的。""",
    ),
}


# 常规池彩蛋：佐佐木 / 朝比奈（大）各 1%，其余保持已选中的常规正文（方案 A：在抽取后覆盖）。
_EASTER_SASAKI_LINES: tuple[str, ...] = (
    "佐佐木：冷静点。你现在的表情，像在给自己加戏。",
    "佐佐木：概率上这不合理——不过，挺像你会遇上的事。",
)
_EASTER_MIKURU_ADULT_LINES: tuple[str, ...] = (
    "朝比奈（大）：别慌。先呼吸。剩下的按步骤拆。",
    "朝比奈（大）：我在。你当我不存在也行——但别一个人硬扛。",
)


def _maybe_easter_replace_normal_flavor(
    state: GameState, action_id: str, step_number: int, base_text: str
) -> str:
    """仅常规池：本局累计动作次数为 1 时不触发；否则按哈希 1%/1%/98% 覆盖。"""
    if sum(state.action_counts.values()) <= 1:
        return base_text
    parts = [state.run_id, str(step_number), action_id, "easter_overlay", str(sum(state.action_counts.values()))]
    if state.random_seed is not None:
        parts.append(str(state.random_seed))
    digest = hashlib.sha256("\0".join(parts).encode("utf-8")).digest()
    r = int.from_bytes(digest[:8], "little") % 10_000
    if r >= 200:
        return base_text
    line_pick = int.from_bytes(digest[8:16], "little")
    if r < 100:
        lines = _EASTER_SASAKI_LINES
    else:
        lines = _EASTER_MIKURU_ADULT_LINES
    return lines[line_pick % len(lines)]


def _flavor_seed(state: GameState, action_id: str, step_number: int, *, pool_tag: str) -> int:
    count = state.action_counts.get(action_id, 0)
    parts = [state.run_id, str(step_number), action_id, str(count), pool_tag]
    if state.random_seed is not None:
        parts.append(str(state.random_seed))
    digest = hashlib.sha256("\0".join(parts).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "little")


def pick_action_flavor(state: GameState, action_id: str, step_number: int) -> str | None:
    """若有该动作的常规文案则返回一段并更新 streak；否则返回 None。"""
    variants: tuple[str, ...] | None = None
    streak_key = action_id
    pool_tag = "normal"

    if action_id in ACTION_IDS_ENSEMBLE_BURST and _ensemble_burst_active(state):
        variants = _ENSEMBLE_BURST_VARIANTS
        streak_key = ENSEMBLE_BURST_STREAK_KEY
        pool_tag = "ensemble_burst"
    elif action_id in ACTION_IDS_NAGATO_FATIGUE_FLAVOR and state.nagato_fatigue >= ACTION_FLAVOR_FATIGUE_THRESHOLD:
        variants = ACTION_FLAVOR_VARIANTS_FATIGUE.get(action_id)
        streak_key = f"{action_id}{_FLAVOR_STREAK_SUFFIX_FATIGUE}"
        pool_tag = "nagato_fatigue"
    elif action_id == ACTION_ID_MIKURU_CRITICAL_FLAVOR and _mikuru_critical(state):
        variants = ACTION_FLAVOR_VARIANTS_MIKURU.get(action_id)
        streak_key = f"{action_id}{_FLAVOR_STREAK_SUFFIX_MIKURU}"
        pool_tag = "mikuru_critical"
    elif action_id in ACTION_IDS_KYON_COLLAPSE and _kyon_collapse_active(state):
        if _kyon_inner_pool_coinflip_inner(state, action_id, step_number):
            tier = _kyon_collapse_tier(state)
            variants = _KYON_COLLAPSE_BY_TIER[tier]
            streak_key = f"{action_id}{_FLAVOR_STREAK_SUFFIX_KYON_TIER.format(tier)}"
            pool_tag = f"kyon_collapse_{tier}"
        else:
            variants = ACTION_FLAVOR_VARIANTS.get(action_id)
            streak_key = action_id
            pool_tag = "normal"
    else:
        variants = ACTION_FLAVOR_VARIANTS.get(action_id)
        streak_key = action_id
        pool_tag = "normal"
    if not variants:
        return None
    recent_map = state.action_flavor_recent
    recent = tuple(recent_map.get(streak_key, ()))
    banned: int | None = None
    if len(recent) >= 2 and recent[-1] == recent[-2]:
        banned = recent[-1]
    n = len(variants)
    pool = [i for i in range(n) if i != banned] if banned is not None else list(range(n))
    rng = random.Random(_flavor_seed(state, action_id, step_number, pool_tag=pool_tag))
    idx = rng.choice(pool)
    if len(recent) < 2:
        new_recent = recent + (idx,)
    else:
        new_recent = (recent[-1], idx)
    recent_map[streak_key] = new_recent
    text = variants[idx]
    if pool_tag == "normal" and text:
        text = _maybe_easter_replace_normal_flavor(state, action_id, step_number, text)
    return text


# 兼容旧测试名
CLUB_ACTION_ID = "社团活动"


def pick_club_activity_flavor(state: GameState, step_number: int) -> tuple[str, tuple[int, ...]]:
    """仅测试兼容：等价于 pick_action_flavor + 返回 recent。"""
    text = pick_action_flavor(state, CLUB_ACTION_ID, step_number)
    assert text is not None
    return text, tuple(state.action_flavor_recent.get(CLUB_ACTION_ID, ()))
