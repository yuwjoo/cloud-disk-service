export type GetDirectoryListRequestQuery = {
  folderUUID?: string; // 文件夹uuid
}; // 请求参数

export type GetDirectoryListResponseData = {
  folderPath: { uuid: string; name: string }[]; // 文件路径
  list: {
    uuid: string; // uuid
    type: string; // 类型
    name: string; // 名称
    size: number; // 大小
    createTime: number; // 创建日期时间戳
    modifiedTime: number; // 修改日期时间戳
  }[]; // 文件列表
}; // 响应数据

export {};
