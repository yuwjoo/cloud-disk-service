try {
  throw { code: 400, msg: '错误消息' };
} catch (err) {
  console.log(err.code, err.msg);
}
