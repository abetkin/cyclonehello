
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
      return {
        value: undefined
      }
    },
    componentDidMount: function() {
      window.setInterval(function(){
        if (this.state.value) {
          this.setState({value: this.state.value + 1})
        }
      }.bind(this), 1000);
    },
    componentWillReceiveProps: function(nextProps) {
      this.setState({value: nextProps.time})
    },
    render: function(){
        return (
          <div>{this.state.value}</div>
      )
    }
});

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