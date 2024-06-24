// 定义路由-配置
export type DefineRouteConfig = {
  method: DefineRouteConfigMethod;
  middlewares?: DefineRouteConfigHandler[];
  handler: DefineRouteConfigHandler;
  options?: DefineRouteConfigOptions;
};

// 定义路由-配置-请求方式
export type DefineRouteConfigMethod = 'post' | 'get' | 'put' | 'delete';

// 定义路由-配置-处理函数
export type DefineRouteConfigHandler = (req: any, res: any, next: any) => any;

// 定义路由-配置-选项
export type DefineRouteConfigOptions = {
  authorization?: boolean; // 身份认证
  disabled?: boolean; // 禁用接口
  bodyParser?: 'json' | 'urlencoded' | 'text' | 'raw'; // 请求body解析格式
};

// 定义路由-返回
export type DefineRouteReturn = {
  method: DefineRouteConfigMethod;
  middlewares: DefineRouteConfigHandler[];
  handler: DefineRouteConfigHandler;
  options: Required<Omit<DefineRouteConfigOptions, 'bodyParser'>> &
    Pick<DefineRouteConfigOptions, 'bodyParser'>;
};

// 定义响应body-选项
export type DefineResponseBodyOptions<T> = {
  code?: ResponseBody['code']; // 响应码
  data?: T; // 响应数据
  msg?: ResponseBody['msg']; // 响应消息
};

// 定义响应body-返回
export type defineResponseBodyReturn<T> = ResponseBody<T>;
