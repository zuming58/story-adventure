# 图片生成预留说明

## 角色参考图

当前用于后续图生图/参考图的一致性素材：

- `story-adventure/assets/characters/deer-rabbit-character-reference.png`（首选）
- `story-adventure/assets/characters/deer-rabbit-reference.png`
- `story-adventure/assets/characters/deer-rabbit-group-reference.png`

如果后续有更标准的角色设定图，应优先替换或新增到 `assets/characters/`，并把首选路径更新到这里。

## 固定角色提示词

每一幕生成插图时，都要固定加入以下角色描述：

小鹿女孩：浅米色鹿毛，大耳朵，小鹿角，黑色耳机挂在脖子上，白色连帽短袖，胸前简化彩虹徽章但不要文字，浅绿色短裤，彩虹手环，活泼友善，像社区故事向导。

小兔子男孩：灰白色兔毛，长耳朵，戴细框眼镜，浅蓝色连帽上衣，米色工装短裤，手里拿平板或故事书，彩虹手环，聪明温和，像 AI 故事老师。

统一画风：2D 儿童绘本插画，柔和手绘线条，轻微水彩和 gouache 质感，温暖光照，清晰干净，适合小学高年级儿童，不幼稚，不写实，不要 3D 渲染，不要文字、logo、水印。

如果某一幕不需要小鹿和小兔子出现，后端图片请求可以传 `includeGuides: false`，只保留统一画风提示词。

## 后续接口思路

如果图片模型支持参考图/图生图：

1. 后端读取固定角色参考图。
2. 将本幕 `imagePrompt`、固定角色提示词和参考图一起提交。
3. 返回本幕 `imageUrl`，前端自动显示。

如果图片模型只支持纯文生图：

1. 后端只提交本幕 `imagePrompt` 和固定角色提示词。
2. 角色一致性会弱一些，作为降级方案。
