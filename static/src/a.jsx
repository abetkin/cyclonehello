const grid = (
  <Grid>
    <Row className='show-grid'>
      <Col xs={6} md={4}>Hola</Col>
      <Col xs={6} md={4}>todo</Col>
      <Col xs={6} md={4}>mundo</Col>
    </Row>
  </Grid>
);

React.render(grid, document.getElementById("example"));