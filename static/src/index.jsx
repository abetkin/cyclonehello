
var RB = ReactBootstrap;
var Grid = RB.Grid;
var Row = RB.Row;
var Col = RB.Col;
var ListGroup = RB.ListGroup;
var ListGroupItem = RB.ListGroupItem;
var Button = RB.Button;
var ButtonToolbar = RB.ButtonToolbar;
var Table = RB.Table;


callers = {{ json }}

var Queue = React.createClass({
    getInitialState: function() {
        return {data: {instances: []}};
    },
    fetchItem: function(id){
        fetch('/posters/' + id + '?format=json')
        .then(function(response) {
            return response.json()
        }).then(function(json) {
            console.log('parsed json', json)
            this.setState({data: json});
        }.bind(this)).catch(function(ex) {
            console.log('json parsing failed', ex);
        })
    },
    componentDidMount: function() {
        this.fetchItem(this.props.item.id);
    },
    componentWillReceiveProps: function(props){
        this.fetchItem(props.item.id);
    },
    render: function(){
        return (
            <div>
            <p><b>{this.props.item.title}</b></p>
            <p>{this.props.item.description}</p>
            <p>
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Start date</th>
                      <th>Place name</th>
                      <th>City</th>
                    </tr>
                  </thead>
                  <tbody>
                {this.state.data.instances.map(function(ins) {
                  return (
                    <tr>
                      <td>{ins.start}</td>
                      <td>{ins.place.name}</td>
                      <td>{ins.place.city.name}</td>
                    </tr>
                )})}
                  </tbody>
                  </Table>
            </p>
            </div>
        )
    }
});








var grid = (
  <Row className='show-grid'>
      <Col xs={4}>Hola</Col>
      <Col xs={4}>todo</Col>
      <Col xs={4}>mundo</Col>
  </Row>
);















React.render(grid, document.getElementById("example"));