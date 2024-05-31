import express from 'express';
import { useConfig } from '@/utils/config';
import { cors } from '@/middlewares/cors';
import { loadRouter } from '@/utils/router';

const app = express();

app.use(cors); // 跨域处理
app.use('/static', express.static('public')); // 静态资源目录

loadRouter(app); // 加载路由

app.listen(useConfig().port, () => {
  console.log(`Server is running on ${useConfig().port} ...`);
});
