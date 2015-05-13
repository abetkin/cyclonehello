
var RB = ReactBootstrap;
var Grid = RB.Grid;
var Row = RB.Row;
var Col = RB.Col;
var ListGroup = RB.ListGroup;
var ListGroupItem = RB.ListGroupItem;
var Button = RB.Button;
var ButtonToolbar = RB.ButtonToolbar;
var Table = RB.Table;



var Message = React.createClass({
    source: new EventSource('/eventsource'),

    getInitialState: function() {
        return {message: '-'};
    },
    componentDidMount: function() {
        this.source.onmessage = function(e) {
          this.setState({message: e.data});
        }.bind(this);
    },

    render: function(){
        return (
            <div>
              {this.state.message}
            </div>
        )
    }
});


var grid = (
  <Row className='show-grid'>
      <Col xs={4}><Message/></Col>
      <Col xs={4}>-</Col>
      <Col xs={4}>-</Col>
  </Row>
);

React.render(grid, document.getElementById("main"));