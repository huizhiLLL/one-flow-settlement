## One魔方赛事流水管理系统 - 完整开发方案

### 系统架构概览

**前端**: 纯HTML/CSS/JavaScript（部署到GitHub Pages）
**后端**: Sealos Serverless Functions
**数据库**: MongoDB
**部署**: 前端GitHub Pages + 后端Sealos云

### 数据库设计

**MongoDB集合: tournaments**
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
  tournamentType: String,     // 比赛类型：协会机构/高校联赛/高校校园赛
  isCertified: Boolean,       // 是否为认证赛
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

### 前端页面设计

#### 1. 数据看板页面 (index.html)
- **总流水统计**
- **总收入统计** 
- **月度统计**
- **比赛场数统计**
- **快速导航到其他页面**

#### 2. 流水详情页面 (records.html)
- **完整数据表格展示**
- **搜索功能**（按比赛名称、日期范围）
- **筛选功能**（按比赛类型、是否认证、是否结算）
- **排序功能**（按日期、流水金额等）
- **编辑/删除操作**
- **导出Excel功能**
- **结算状态切换按钮**

#### 3. 流水录入页面 (input.html)
- **表单输入所有必填字段**
- **实时计算显示**
- **数据验证**
- **提交后自动跳转到详情页面**

### 后端API设计

#### Sealos Serverless Functions

1. **GET /api/tournaments** - 获取所有比赛记录
2. **POST /api/tournaments** - 新增比赛记录
3. **PUT /api/tournaments/:id** - 更新比赛记录
4. **DELETE /api/tournaments/:id** - 删除比赛记录
5. **GET /api/dashboard** - 获取看板统计数据
6. **GET /api/export** - 导出Excel数据

### 核心计算逻辑

```javascript
function calculateFees(data) {
  const { totalRevenue, participantCount, tournamentType, isCertified, medalCount, medalPrice } = data;
  
  // 手续费计算
  let processingFee;
  if (tournamentType === '协会机构' || tournamentType === '高校联赛') {
    processingFee = totalRevenue * 0.0108; // 1.08%
  } else { // 高校校园赛
    processingFee = totalRevenue * 0.004;  // 0.4%
  }
  
  // 微信手续费
  const wechatFee = totalRevenue * 0.006; // 0.6%
  
  // 认证费
  let certificationFee = 0;
  if (tournamentType === '协会机构' && isCertified) {
    certificationFee = participantCount;
  }
  
  // 总手续费
  let totalFee = processingFee + wechatFee + certificationFee;
  
  // 最低收费处理
  if (tournamentType === '协会机构' && totalFee < 100) {
    totalFee = 100;
  }
  
  // 奖牌费用
  const medalCost = medalCount * medalPrice;
  
  // 主办结算费用
  const hostSettlement = totalRevenue - totalFee - medalCost;
  
  // 总收入
  const totalIncome = certificationFee + processingFee;
  
  return {
    processingFee,
    wechatFee,
    certificationFee,
    totalFee,
    medalCost,
    hostSettlement,
    totalIncome
  };
}
```

### 项目文件结构

```
one-cube-tournament-system/
├── frontend/
│   ├── index.html          # 数据看板
│   ├── records.html        # 流水详情
│   ├── input.html          # 流水录入
│   ├── css/
│   │   └── style.css       # 样式文件
│   └── js/
│       ├── dashboard.js    # 看板逻辑
│       ├── records.js      # 详情页逻辑
│       ├── input.js        # 录入页逻辑
│       ├── api.js          # API调用封装
│       └── utils.js        # 工具函数
├── backend/
│   ├── api/
│   │   ├── tournaments.js  # 比赛数据CRUD
│   │   ├── dashboard.js    # 看板数据
│   │   └── export.js       # 导出功能
│   └── utils/
│       ├── database.js     # 数据库连接
│       └── calculator.js   # 计算逻辑
└── README.md
```

[1 tool called]

### 开发优先级和步骤

1. **第一阶段**: 创建基本项目结构和前端静态页面
2. **第二阶段**: 实现后端API和数据库连接
3. **第三阶段**: 完善前端交互逻辑
4. **第四阶段**: 测试和优化
5. **第五阶段**: 部署到GitHub Pages和Sealos

### 技术要点

- **响应式设计**: 确保在不同设备上良好显示
- **数据验证**: 前后端双重验证
- **错误处理**: 完善的错误提示和处理机制
- **性能优化**: 合理的数据分页和缓存策略

