
var RB = ReactBootstrap;
var Grid = RB.Grid;
var Row = RB.Row;
var Col = RB.Col;
var ListGroup = RB.ListGroup;
var ListGroupItem = RB.ListGroupItem;
var Button = RB.Button;
var ButtonToolbar = RB.ButtonToolbar;
var Table = RB.Table;


var QueuesTable= React.createClass({
    eventsource: new EventSource('/eventsource'),

    onEvent: function(ev) {
      alert(ev);
      var qname = ev.data['queue_name'];
      var queues = this.state.queues;
      queues[qname] = ev.data;
      this.setState({queues: queues})

    },


    getInitialState: function() {
        return {queues: {}}
    },
    componentDidMount: function() {
      this.eventsource.onmessage = this.onEvent;
    },

    render: function(){
        var queues = this.state.queues;
        return (
          // if this.state.queues
          <Table responsive>
            <thead>
              {Object.keys(queues).map(function(name) {
                return (
                  <th>{name}</th>
                )})
              }
            </thead>
            <tbody>
              {Object.keys(queues).map(function(name) {
                return (
                <tr>
                  <td>Звонков: queues[name].count</td>
                  <td>Ожидание: queues[name].time_waiting</td>
                </tr>
                )})
              }
            </tbody>
          </Table>
      )
    }
});

React.render(<QueuesTable/>, document.getElementById("main"));