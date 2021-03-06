/* eslint-disable no-eval, no-console */

const { EventEmitter } = require('events');

const RecordEventObject = require('./record_event_object');
const RecordEditEventObject = require('./record_edit_event_object');
const RecordEditSubmitEventObject = require('./record_edit_submit_event_object');
const RecordEditSubmitSuccessEventObject = require('./record_edit_submit_success_event_object');
const RecordDeleteEventObject = require('./record_delete_event_object');
const RecordChangeEventObject = require('./record_change_event_object');
const RecordProcessEventObject = require('./record_process_event_object');
const RecordsEventObject = require('./records_event_object');
const ReportEventObject = require('./report_event_object');

const schema = require('../schema');

// kintone.eventsからアクセスできないようにEventクラス外へ配置
const app = {
  record: {
    index: {
      show: (event, options) => new RecordsEventObject(event, options),
      edit: {
        show: (event, options) => new RecordEventObject(event, options),
        submit: (event, options) => new RecordEditSubmitEventObject(event, options),
        change: {},
      },
      delete: {
        submit: (event, options) => new RecordDeleteEventObject(event, options),
      },
    },
    detail: {
      show: (event, options) => new RecordEventObject(event, options),
      delete: {
        submit: (event, options) => new RecordDeleteEventObject(event, options),
      },
      process: {
        proceed: (event, options) => new RecordProcessEventObject(event, options),
      },
    },
    create: {
      show: (event, options) => new RecordEditEventObject(event, options),
      submit: (event, options) => new RecordEditSubmitEventObject(event, options),
      change: {},
    },
    edit: {
      show: (event, options) => new RecordEditEventObject(event, options),
      submit: (event, options) => new RecordEditSubmitEventObject(event, options),
      change: {},
    },
    print: {
      show: (event, options) => new RecordEventObject(event, options),
    },
  },
  report: {
    show: (event, options) => new ReportEventObject(event, options),
  },
};

// 関数に関数を定義する
app.record.index.edit.submit.success = (event, options) =>
  new RecordEditSubmitSuccessEventObject(event, options);
app.record.create.submit.success = (event, options) =>
  new RecordEditSubmitSuccessEventObject(event, options);
app.record.edit.submit.success = (event, options) =>
  new RecordEditSubmitSuccessEventObject(event, options);

// fields項目の関数を定義する
const appendFieldChangeEvent = (event) => {
  const match = event.match(/^(app\.record\.(index\.edit|edit|create)\.change)\.([^.]+)$/);
  if (!match) return;
  const key = match[3];
  if (!schema.fields.properties || !schema.fields.properties[key]) return;
  const { type } = schema.fields.properties[key];
  if (!RecordChangeEventObject.TYPES.some(t => t === type)) return;

  eval(`${match[1]}`)[key] = (ev, options) =>
    // match[2]=editの場合のみ、トリガの変更がキャンセルされる可能性がある
    new RecordChangeEventObject(ev, options, type, match[2] !== 'edit');
};

const removeFieldChangeEvent = (event) => {
  if (event) {
    const match = event.match(/^(app\.record\.(index\.edit|edit|create)\.change)\.([^.]+)$/);
    if (!match) return;
    const key = match[3];
    if (typeof eval(`${event}`) === 'function') {
      eval(`${match[1]}`)[key] = {};
    }
  } else {
    app.record.index.edit.change = {};
    app.record.edit.change = {};
    app.record.create.change = {};
  }
};

const validate = (event) => {
  if (
    !event.match(/^app\.(record|report)(\.(index|detail))?(\.(create|edit|delete|print))?(\.(show|change|submit|process))?(\.(success|proceed))?(\..+)?$/)
  ) {
    console.warn(`\nno match event : ${event}`);
    return false;
  }

  if (typeof eval(`${event}`) !== 'function') {
    console.warn(`\nmissing event : ${event}`);
    return false;
  }
  return true;
};

module.exports = class Event extends EventEmitter {
  emit(event, ...args) {
    const promises = [];
    this.listeners(event).forEach((listener) => {
      promises.push(listener(...args));
    });
    return Promise.all(promises);
  }

  async do(event, options) {
    appendFieldChangeEvent(event);
    if (!validate(event)) return null;

    const eventObj = eval(`${event}`)(event, options);
    // kintone.appへ変更を通知
    await this.emit('event.do', event, options);
    await this.emit('event.type.changed', event, eventObj.record);
    // 複数ハンドラ登録されていた場合、最後のみ反映させる為popする
    const resolve = (await this.emit(event, eventObj)).pop();

    if (resolve && resolve.done) resolve.done();
    if (eventObj.cancel) eventObj.cancel(resolve);

    return resolve;
  }

  off(event) {
    if (event) {
      this.removeAllListeners(event);
    } else {
      this.removeAllListeners();
    }
    removeFieldChangeEvent(event);
  }
};
