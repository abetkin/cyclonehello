

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
        console.log('val>', value)
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

String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0" + hours;}
    if (minutes < 10) {minutes = "0" + minutes;}
    if (seconds < 10) {seconds = "0" + seconds;}
    var time    = hours + ':' + minutes + ':' + seconds;
    return time;
}

var QueuesTable= React.createClass({
    eventsource: new EventSource('/eventsource'),

    onEvent: function(ev) {
      data = JSON.parse(ev.data)
      console.log('ev', data.q_name, data.time_waiting, data.count)
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
        console.log(q_names)
        var queues = this.state.queues;
        var event = this.state.event;
        console.log('ev>', event.q_name, event.count, event.time_waiting)
        return (
          <div className="row">
            <div className="col-md-6">
              <table className="table">
                <thead>
                  <tr>
                    {q_names.map(function(q_name) {
                      return <th>{q_name}</th>
                    }, this)}
                  </tr>
                </thead>
                <tbody>
                    <tr>
                      {q_names.map(function(q_name) {
                        return <td>Звонков: {queues[q_name].count}</td>
                      }, this)}
                    </tr>
                    <tr>
                      {q_names.map(function(q_name) {
                        if (event && event.q_name == q_name){
                          var timer_data = event;
                        } else {
                          var timer_data = queues[q_name]
                        }
                        return <td>Ожидание: <Timer data={timer_data}/></td>
                      }, this)}
                    </tr>
                </tbody>
              </table>
            </div>
          </div>
      )
    }
});

React.render(<QueuesTable/>, document.getElementById("main"));