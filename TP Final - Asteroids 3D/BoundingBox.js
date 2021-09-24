class BoundingBox {
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }

  contains(point) {
    return point[0] >= this.min[0] && point[0] < this.max[0] &&
      point[1] >= this.min[1] && point[1] < this.max[1] &&
      point[2] >= this.min[2] && point[2] < this.max[2];
  }
}