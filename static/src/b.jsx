

var Timer = React.createClass({
    getInitialState: function() {
      return {value: null}
    },
    periodicTask: function(){
        if (this.state.value != undefined) {
          this.setState({value: this.state.value + 1});
        }
    },
    componentDidMount: function() {
      this.setState({value: this.props.time_waiting});
      this.timer = window.setInterval(this.periodicTask, 1000);
    },
    componentWillReceiveProps: function(nextProps) {
      data = nextProps.data;
      console.log('dat>', data.count, data.time_waiting);
      if (data.count == 0){
        this.setState({value: undefined});
      } else if (data.time_waiting != undefined) {
        this.setState({value: parseInt(data.time_waiting)});
      }
    },
    render: function(){
        var value = this.state.value;
        if (value != undefined) {
          repr = (value + '').toHHMMSS();
        } else {
          repr = '-';
        }
        return (
          <div>{repr}</div>
        )
    }
});

var repr_time = function(data){
    if (data != undefined) {
      return '-';
    }
    var sec_num = parseInt(data, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0" + hours;}
    if (minutes < 10) {minutes = "0" + minutes;}
    if (seconds < 10) {seconds = "0" + seconds;}
    var time    = hours + ':' + minutes + ':' + seconds;
    return time;
}

var Queue= React.createClass({
    getInitialState: function() {
      return {value: null}
    },
    periodicTask: function(){
        if (this.state.value != undefined) {
          this.setState({value: this.state.value + 1});
        }
    },
    componentDidMount: function() {
      this.setState({value: this.props.time_waiting});
      this.timer = window.setInterval(this.periodicTask, 1000);
    },
    componentWillReceiveProps: function(nextProps) {
      data = nextProps.data;
      console.log('dat>', data.count, data.time_waiting);
      if (data.count == 0){
        this.setState({value: undefined});
      } else if (data.time_waiting != undefined) {
        this.setState({value: parseInt(data.time_waiting)});
      }
    },
    render: function(){

        return (
          <div className="col-md-1">
    <table className="table table-condensed">
      <thead>
        <tr>
          <th>
            <span className="pull-left">{this.state.name}</span>
            <span className="pull-right">
              &#9742; {repr_time(this.state.time_talking)}
            </span>
            <div className="clearfix"></div>
          </th>
        </tr>
      </thead>
      <tbody>
          <tr>
              <td className="success"></td>
          </tr>
          <tr>
              <td className="success"></td>
          </tr>
          <tr>
              <td className="success"></td>
          </tr>
          <tr>
              <td className="success"></td>
          </tr>
          <tr>
              <td className="success"></td>
          </tr>
          <tr>
              <td className="success"></td>
          </tr>
          <tr>
              <td className="success"></td>
          </tr>
          <tr>
              <td className="success"></td>
          </tr>
          <tr>
              <td className="success"></td>
          </tr>
          <tr>
              <td className="success"></td>
          </tr>

          <tr>
              <td className="success"><center><h4>&#8987; 11:34</h4></center></td>
          </tr>
          <tr>
              <td><center><h4>11</h4></center></td>
          </tr>
      </tbody>
    </table>
  </div>
        )
    }
});

var QueuesTable= React.createClass({
    eventsource: new EventSource('/eventsource'),

    onEvent: function(ev) {
      data = JSON.parse(ev.data)
      info = {}
      info[data.q_name] = data
      this.state.queues[data.q_name] = data
      var queues = jQuery.extend(info, this.state.queues);

      this.setState({queues: queues, event: data})
      // only if length changes
    },
    getInitialState: function() {
        // init. state
        return {
          queues: queues_json,
          event: {},
        }
    },
    componentDidMount: function() {
      this.eventsource.onmessage = this.onEvent;
    },
    render: function(){
        var q_names = Object.keys(this.state.queues);
        q_names.sort();
        var queues = this.state.queues;
        var event = this.state.event;
        return (
          <div className="row">
              {q_names.map(function(q_name) {
                  if (event && event.q_name == q_name){
                    var queue_data = event;
                  } else {
                    var queue_data = queues[q_name]
                  }
                  return <Queue data={queue_data}/>
              })}
          </div>
      )
    }
});

React.render(<QueuesTable/>, document.getElementById("main"));