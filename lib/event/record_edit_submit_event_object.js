// record.index.edit.submit
// record.create.submit
// record.edit.submit

const fixture = require('./../fixture');
const RecordEventObject = require('./record_event_object');

module.exports = class RecordEditSubmitEventObject extends RecordEventObject {
  constructor(event, options = {}) {
    super(event, options);
  }

  done() {
    this.rollbackDisallowFields();
    fixture.update(this.record);
  }
};
