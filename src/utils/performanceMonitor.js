class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  startMeasure(key) {
    this.metrics[key] = {
      startTime: Date.now(),
      endTime: null,
      duration: null,
    };
  }

  endMeasure(key) {
    if (this.metrics[key]) {
      this.metrics[key].endTime = Date.now();
      this.metrics[key].duration = this.metrics[key].endTime - this.metrics[key].startTime;
      
      if (__DEV__) {
        console.log(`[Performance] ${key}: ${this.metrics[key].duration}ms`);
      }
      
      return this.metrics[key].duration;
    }
    return null;
  }

  getMeasure(key) {
    return this.metrics[key];
  }

  getAllMetrics() {
    return this.metrics;
  }

  clearMetrics() {
    this.metrics = {};
  }

  logSlowOperation(key, threshold = 1000) {
    const metric = this.metrics[key];
    if (metric && metric.duration > threshold) {
      console.warn(`[Performance Warning] ${key} took ${metric.duration}ms (threshold: ${threshold}ms)`);
    }
  }
}

// Export as named export
export const performanceMonitor = new PerformanceMonitor();
