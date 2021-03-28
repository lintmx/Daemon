/*
 * @Author: Copyright(c) 2020 Suwings
 * @Date: 2020-11-23 17:45:02
 * @LastEditTime: 2021-03-28 11:26:20
 * @Description: 守护进程启动文件
 */

const { config } = require("./entity/config");
const { logger } = require("./service/log");

// eslint-disable-next-line no-unused-vars
const { Socket } = require("socket.io");
const fs = require("fs-extra");

logger.info(`欢迎使用 Daemon 程序.`);

const io = (global.io = require("socket.io")(config.port, {
  serveClient: false,
  pingInterval: 10000,
  pingTimeout: 10000,
  cookie: false
}));

// 初始化 Session 会话变量
// 使用轻量级的会话功能
io.use((socket, next) => {
  if (!socket.session) socket.session = {};
  next();
});

// 配置文件与数据目录相关操作
if (!fs.existsSync(config.instanceDirectory)) {
  fs.mkdirsSync(config.instanceDirectory);
}

const router = require("./service/router");
const protocol = require("./service/protocol");
const { instanceService } = require("./service/instance_service");

// 装载实例
try {
  logger.info("正在装载本地实例文件...");
  instanceService.loadInstances(config.instanceDirectory);
  logger.info(`全部本地实例装载完毕，总计 ${instanceService.getInstancesSize()} 个.`);
} catch (err) {
  logger.error("读取本地实例文件失败，此问题必须修复才可启动:", err);
  process.exit(-1);
}

// 注册链接事件
io.on("connection", (socket) => {
  logger.info(`会话 ${socket.id}(${socket.handshake.address}) 已链接`);

  // 加入到全局Socket对象
  protocol.addGlobalSocket(socket);

  // Socket.io 请求转发到自定义路由控制器
  router.navigation(socket);

  // 断开事件
  socket.on("disconnect", () => {
    // 从全局Socket对象移除
    protocol.delGlobalSocket(socket);
    for (const name of socket.eventNames()) socket.removeAllListeners(name);
    logger.info(`会话 ${socket.id}(${socket.handshake.address}) 已断开`);
  });
});

// 错误报告监听
process.on("uncaughtException", function (err) {
  logger.error(`错误报告(uncaughtException):`, err);
});

// 错误报告监听
process.on("unhandledRejection", (reason, p) => {
  logger.error(`错误报告(unhandledRejection):`, reason, p);
});

// 启动完毕
logger.info(`守护进程已成功启动.`);
logger.info("--------------------");
logger.info(`正在监听 ${config.port} 端口，等待数据...`);
logger.info(`访问密匙(Key): ${config.key}`);
logger.info("退出程序推荐使用 exit 命令关闭.");
logger.info("--------------------");
console.log("");

require("./service/ui");

process.on("SIGINT", function () {
  console.log("\n\n\n\n");
  logger.warn("检测到 SIGINT 关闭进程信号.");
  logger.warn("推荐正常情况下使用 exit 指令来关闭，否则有一定风险损失数据.");
  logger.warn("关闭中....");
  process.exit(0);
});
