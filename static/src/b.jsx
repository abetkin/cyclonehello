
var RB = ReactBootstrap;
var Grid = RB.Grid;
var Row = RB.Row;
var Col = RB.Col;
var ListGroup = RB.ListGroup;
var ListGroupItem = RB.ListGroupItem;
var Button = RB.Button;
var ButtonToolbar = RB.ButtonToolbar;
var Table = RB.Table;

var Timer= React.createClass({
    getInitialState: function() {
      return {value: '-'}
    },
    componentDidMount: function() {
      window.setInterval(function(){
        if (this.state.value != '-') {
          this.setState({value: this.state.value + 1})
        }
      }.bind(this), 1000);
    },
    componentWillReceiveProps: function(nextProps) {
      this.setState({value: nextProps.time})
    },
    render: function(){
        var value = this.state.value;
        if (value != '-'){
          value = (value + '').toHHMMSS()
        }
        return (
          <div>{value}</div>
        )
    }
});

String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}

var QueuesTable= React.createClass({
    eventsource: new EventSource('/eventsource'),

    onEvent: function(ev) {
      data = JSON.parse(ev.data)
      this.setState({data: data})
    },
    getInitialState: function() {
        return {
          queues: {},
          data: {},
        }
    },
    componentDidMount: function() {
      this.eventsource.onmessage = this.onEvent;
    },
    render: function(){
        var data = this.state.data;
        //console.log(data)
        return (
          // if this.state.queues
          <Table responsive>
            <thead>
                  <th>{data.queue_name}</th>
            </thead>
            <tbody>
                <tr>
                  <td>Звонков: {this.state.data.count}</td>
                </tr>
                <tr>
                  <td>Ожидание: <Timer time={this.state.data.time_waiting}/></td>
                </tr>
            </tbody>
          </Table>
      )
    }
});

React.render(<QueuesTable/>, document.getElementById("main"));