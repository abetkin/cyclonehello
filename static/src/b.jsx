
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
      data = JSON.parse(ev.data)
      console.log(data)
      this.setState({data: data})
      //var qname = ev.data['queue_name'];
      //var queues = this.state.queues.clone(); // ?
      //queues[qname] = ev.data;
      //this.setState({queues: queues})

    },

  // timer

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
                  <td>Ожидание: {this.state.data.time_waiting}</td>
                </tr>
            </tbody>
          </Table>
      )
    }
});

React.render(<QueuesTable/>, document.getElementById("main"));