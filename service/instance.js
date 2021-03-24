/*
 * @Projcet: MCSManager Daemon
 * @Author: Copyright(c) 2020 Suwings
 * @License: MIT
 * @Description: 应用实例和实例类实现
 */

// const childProcess = require("child_process");
const { EventEmitter } = require("events");
// const iconv = require("iconv-lite");
// const { logger } = require("../service/log");
// eslint-disable-next-line no-unused-vars
const { InstanceCommand } = require("../entity/commands/command");
const { DataStructure } = require("../service/data_structure");

class InstanceCommandError extends Error {
  constructor(msg) {
    super(msg);
  }
}

class InstanceConfig extends DataStructure {
  constructor(path) {
    super(path);
  }

  parameters(cfg) {
    this.startCommand = cfg.startCommand || "";
    this.stopCommand = cfg.stopCommand || "^C";
    this.cwd = cfg.cwd || ".";
    this.ie = cfg.ie || "GBK";
    this.oe = cfg.oe || "GBK";
    this.save();
  }
}


class Instance extends EventEmitter {
  /**
   * @param {string} startCommand
   */
  constructor(instanceName) {
    super();

    this.STATUS_STOP = Instance.STATUS_STOP;
    this.STATUS_STARTING = Instance.STATUS_STARTING;
    this.STATUS_RUN = Instance.STATUS_RUN;

    //Basic information
    this.processStatus = this.STATUS_STOP;
    this.instanceName = instanceName;

    // Action lock
    this.lock = false;

    // Config init 
    this.config = new InstanceConfig(instanceName);
    this.config.load();

    this.process = null;
    this.startCount = 0;
  }

  parameters(cfg) {
    this.config.parameters(cfg);
  }

  setLock(bool) {
    this.lock = bool;
  }

  /**
   * @param {InstanceCommand} command
   * @return {void}
   */
  execCommand(command) {
    if (this.lock)
      throw new InstanceCommandError("This " + command.info + " operation cannot be completed because the command executes a deadlock.");
    command.exec(this);
  }

  // 使用自定义命令来进行关闭操作
  stop() {
    const stopCommand = this.stopCommand;
    if (stopCommand.toLocaleLowerCase() == "^c") {
      this.process.kill("SIGINT");
    } else {
      this.sendCommand(stopCommand);
    }
  }

  status() {
    return this.processStatus;
  }

  started() {
    this.emit("open", this);
  }

  stoped(code = 0) {
    this.releaseResources();
    this.processStatus = this.STATUS_STOP;
    this.emit("exit", code);
  }

  releaseResources() {
    if (this.process && this.process.stdout && this.process.stderr) {
      // 移除所有动态新增的事件监听者
      for (const eventName of this.process.stdout.eventNames()) this.process.stdout.removeAllListeners(eventName);
      for (const eventName of this.process.stderr.eventNames()) this.process.stderr.removeAllListeners(eventName);
      for (const eventName of this.process.eventNames()) this.process.removeAllListeners(eventName);
      this.process.stdout.destroy();
      this.process.stderr.destroy();
    }
    this.process = null;
  }
}

// 实例类静态变量
Instance.STATUS_STOP = 0;
Instance.STATUS_STARTING = 1;
Instance.STATUS_RUN = 2;

module.exports = {
  Instance
};