// 模拟客户数据API - 用于界面展示测试
import express from 'express';
const app = express();

app.use(express.json());

// 模拟客户数据
const mockCustomers = [
  {
    id: 1,
    shop_name: '刘记桃酥大王(新兴路店)',
    douyin_name: '@liujitaosu',
    region: '河南省许昌市魏都区',
    business_staff: '张经理',
    status: '跟进中',
    order_count: 15,
    total_amount: 28500
  },
  {
    id: 2,
    shop_name: '老北京炸酱面馆',
    douyin_name: '@laobeijing',
    region: '河南省许昌市建安区',
    business_staff: '李主管',
    status: '已成交',
    order_count: 23,
    total_amount: 45200
  },
  {
    id: 3,
    shop_name: '川味火锅城',
    douyin_name: '@chuanweihuo',
    region: '河南省许昌市长葛市',
    business_staff: '王总监',
    status: '已流失',
    order_count: 8,
    total_amount: 12600
  },
  {
    id: 4,
    shop_name: '粤式茶餐厅',
    douyin_name: '@yueshicha',
    region: '河南省许昌市鄢陵县',
    business_staff: '赵经理',
    status: '潜在客户',
    order_count: 3,
    total_amount: 4200
  },
  {
    id: 5,
    shop_name: '东北烧烤大排档',
    douyin_name: '@dongbeikaoya',
    region: '河南省许昌市禹州市',
    business_staff: '孙主管',
    status: '跟进中',
    order_count: 12,
    total_amount: 18900
  }
];

// 获取客户列表API
app.get('/api/mock/customers', (req, res) => {
  const { page = 1, page_size = 10, keyword = '' } = req.query;
  
  let filteredCustomers = mockCustomers;
  
  // 关键词搜索
  if (keyword) {
    filteredCustomers = mockCustomers.filter(customer => 
      customer.shop_name.toLowerCase().includes(keyword.toLowerCase()) ||
      (customer.douyin_name && customer.douyin_name.toLowerCase().includes(keyword.toLowerCase()))
    );
  }
  
  // 分页处理
  const startIndex = (page - 1) * page_size;
  const endIndex = startIndex + parseInt(page_size);
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
  
  res.json({
    code: 0,
    message: 'success',
    data: {
      list: paginatedCustomers,
      total: filteredCustomers.length,
      page: parseInt(page),
      page_size: parseInt(page_size)
    }
  });
});

// 获取单个客户详情
app.get('/api/mock/customers/:id', (req, res) => {
  const customerId = parseInt(req.params.id);
  const customer = mockCustomers.find(c => c.id === customerId);
  
  if (customer) {
    res.json({
      code: 0,
      message: 'success',
      data: customer
    });
  } else {
    res.status(404).json({
      code: 404,
      message: '客户不存在'
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock API Server running on port ${PORT}`);
  console.log(`Customer list endpoint: http://localhost:${PORT}/api/mock/customers`);
});