import React, { Component } from 'react';
import { Upload, Icon, Select, Button, Checkbox, message } from 'antd';
import _ from 'lodash';
import moment from 'moment';
const Dragger = Upload.Dragger;
const Option = Select.Option;

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      uploaded: false,
      dateMap: [],
      dateSelected: [],
      removeDuplicated: true,
      exportData: []
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.exportData !== this.state.exportData) return;
    this._recalculateExportData();
  }

  _recalculateExportData = () => {
    let { dateSelected } = this.state;
    let exportData = _(dateSelected)
      .map(dateFormat => _.find(this.state.dateMap, { dateFormat }))
      .map('records')
      .map(this.state.removeDuplicated ? l => _.uniqBy(l, 'uin') : _.identity)
      .flatten()
      .value();
    this.setState({ exportData });
  }

  draggerProps = {
    name: 'file',
    multiple: false,
    beforeUpload: (file) => {
      this._openFile(file);
      return false;
    }
  }

  _openFile = input => {
    let reader = new FileReader();
    reader.onload = () => {
      this._convert(reader.result);
    };
    reader.readAsText(input);
  }

  _convert = text => {
    let data = [];
    let regex = /^;\d{4}(\d{9})/g;
    _(_.split(text, '\n')).compact().each(line => {
      if (/\d{1}\/\d{2}\/\d{2}/g.test(line)) {
        let date = moment(line, 'YYYY/MM/DD');
        data.push({ date, dateFormat: date.format('YYYY/MM/DD') });
      } else {
        if (regex.test(line)) {
          let r = /^;\d{4}(\d{9})/g.exec(line);
          data[data.length - 1].uin = r[1];
        }
      }
    });
    let dateMap = _(data)
      .groupBy('dateFormat')
      .mapValues((records, dateFormat) => ({ dateFormat, records }))
      .value();
    this.setState({ dateMap: _.values(dateMap), dateSelected: _.keys(dateMap), uploaded: true });
    message.success(`File uploaded successfully. Totally ${data.length} records parsed.`);
  }

  _handleSelectChange = dateSelected => {
    this.setState({ dateSelected });
  }

  _downloadCsv = () => {
    let exportData = this.state.exportData;
    let rows = _(exportData).map(({ date, dateFormat, uin }) => [ dateFormat, uin ]).value();
    rows.unshift([ 'Date', 'UIN' ]);
    let csvContent = "data:text/csv;charset=utf-8,";
    rows.forEach(function(rowArray){
       let row = rowArray.join(",");
       csvContent += row + "\r\n";
    });
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `export-${moment().unix()}.csv`);
    document.body.appendChild(link);
    link.click();
  }

  render() {
    let { dateMap, exportData, uploaded, dateSelected, removeDuplicated } = this.state;
    return (
      <div style={{ padding: '2em' }}>
        { !uploaded && (
          <div>
            <Dragger {...this.draggerProps}>
              <p className="ant-upload-drag-icon">
                <Icon type="inbox" />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">Support for the text data exported from the card reader.</p>
            </Dragger>
          </div>
        ) }
        { uploaded && (
          <div>
            <div>
              <p>Filter by Date</p>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Please select"
                onChange={this._handleSelectChange}
                defaultValue={dateSelected}
              >
                { dateMap.map(({ dateFormat, records }) => (
                  <Option key={dateFormat} value={dateFormat} title={dateFormat}>{dateFormat} - {records.length}</Option>
                )) }
              </Select>
            </div>
            <div style={{ marginTop: '50px' }}>
              <p>Options</p>
              <Checkbox
                defaultChecked={removeDuplicated}
                onChange={e => this.setState({ removeDuplicated: e.target.checked })}
              >
                Remove Duplicated UIN
              </Checkbox>
            </div>
            <div style={{ marginTop: '50px' }}>
              <h3>Record Selected: {exportData.length}</h3>
              <Button type="primary" icon="download" size="large" onClick={this._downloadCsv}>Download</Button>
            </div>
          </div>
        ) }
      </div>
    );
  }
}

export default App;
