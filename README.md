# One魔方赛事流水管理系统

基于前后端分离架构的魔方赛事流水统计和管理系统，支持实时计算、数据统计和导出功能。

## 🎯 功能特性

### 📊 数据看板
- 总流水、总收入、比赛场数、参赛人数统计
- 月度数据统计和对比
- 最近比赛记录展示
- 实时数据刷新

### 📋 流水详情管理
- 完整的比赛流水数据表格展示
- 多维度搜索和筛选（比赛名称、类型、认证状态、结算状态、日期范围）
- 数据排序功能
- 在线编辑和删除记录
- 一键切换结算状态
- 数据分页显示

### ➕ 流水录入
- 友好的表单界面
- 实时计算预览
- 数据验证和错误提示
- 自动计算手续费、认证费、奖牌费用等
- 表单自动保存

### 📥 数据导出
- 支持导出为Excel/CSV格式
- 可根据筛选条件导出
- 包含完整的计算结果

## 🏗️ 系统架构

```
前端 (GitHub Pages)
├── HTML/CSS/JavaScript (原生三件套)
├── 响应式设计
└── RESTful API调用

后端 (Sealos/Laf Serverless)
├── 云函数接口
├── MongoDB数据库
└── 自动计算逻辑
```

## 💰 费用计算规则

根据2025年新版收费标准：

### 手续费
- **协会机构/高校联赛**: 流水总计 × 1.08%
- **高校校园赛**: 流水总计 × 0.4%

### 微信手续费
- 所有类型: 流水总计 × 0.6%

### 认证费
- **协会机构认证赛**: 参赛人数 × 1元
- **其他类型**: 0元

### 最低收费
- **协会机构**: 总手续费最低100元
- **其他类型**: 无最低收费

### 计算公式
```
总手续费 = 手续费 + 微信手续费 + 认证费
主办结算费用 = 流水总计 - 总手续费 - 奖牌费用
总收入 = 认证费 + 手续费
```

## 🗄️ 数据库结构

### tournaments 集合
```javascript
{
  _id: ObjectId,
  tournamentName: String,      // 比赛名称
  eventDate: Date,            // 举办日期
  participantCount: Number,   // 参赛人数
  withdrawalCount: Number,    // 退赛人数
  totalRevenue: Number,       // 流水总计
  wechatPayment: Number,      // 微信支付
  refundBalance: Number,      // 退款结余
  medalCount: Number,         // 奖牌数量
  medalPrice: Number,         // 奖牌单价
  tournamentType: String,     // 比赛类型
  isCertified: Boolean,       // 是否认证赛
  // 计算字段
  processingFee: Number,      // 手续费
  wechatFee: Number,         // 微信手续费
  certificationFee: Number,   // 认证费
  totalFee: Number,          // 总手续费
  medalCost: Number,         // 奖牌费用
  hostSettlement: Number,     // 主办结算费用
  totalIncome: Number,       // 总收入
  isSettled: Boolean,        // 是否结算
  createdAt: Date,           // 创建时间
  updatedAt: Date            // 更新时间
}
```

## 🚀 部署指南

### 前端部署 (GitHub Pages)

1. **创建GitHub仓库**
```bash
git clone <your-repo-url>
cd one-cube-tournament-system
```

2. **上传前端文件**
```
├── index.html
├── records.html
├── input.html
├── css/style.css
└── js/
    ├── utils.js
    ├── api.js
    ├── dashboard.js
    ├── records.js
    └── input.js
```

3. **配置GitHub Pages**
- 进入仓库设置 → Pages
- 选择 main 分支作为源
- 自动部署完成

### 后端部署 (Sealos/Laf)

1. **创建云函数**
在Sealos/Laf平台创建以下云函数：

- `tournaments` - 比赛数据CRUD操作
- `dashboard` - 仪表板统计数据
- `export` - 数据导出功能

2. **上传代码**
将 `backend/api/` 目录下的文件分别创建为对应的云函数

3. **配置数据库**
- 数据库会自动创建
- 集合和索引会在首次访问时自动创建

4. **更新API地址**
在前端 `js/api.js` 中更新 `API_CONFIG.BASE_URL` 为实际的云函数地址

## 🔧 本地开发

### 前端开发
```bash
# 直接打开HTML文件或使用简单HTTP服务器
python -m http.server 8000
# 或
npx live-server
```

### 后端开发
1. 在Sealos/Laf平台在线编辑云函数
2. 使用平台提供的调试工具测试API

## 📱 响应式设计

系统采用响应式设计，支持：
- 桌面端 (≥1200px)
- 平板端 (768px-1199px)  
- 移动端 (<768px)

## 🎨 界面特性

- 现代化的UI设计
- 流畅的动画效果
- 直观的数据可视化
- 友好的错误提示
- 加载状态反馈

## 🔒 数据安全

- 前后端双重数据验证
- 服务端权威计算结果
- 防止前端数据篡改
- 错误处理和日志记录

## 📞 技术支持

如有问题或建议，请创建Issue或联系开发团队。

## 📄 许可证

[MIT License](LICENSE)

---

**One魔方赛事流水管理系统** - 让赛事流水管理更简单高效！
