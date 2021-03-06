// app.record.create.show
// app.record.edit.show

const fixture = require('./../fixture');
const RecordEventObject = require('./record_event_object');

module.exports = class RecordEditEventObject extends RecordEventObject {
  constructor(event, options = {}) {
    super(event, options);
    this.reuse = false;
  }

  done() {
    this.rollbackDisallowFields();
    fixture.update(this.record);
  }
};
