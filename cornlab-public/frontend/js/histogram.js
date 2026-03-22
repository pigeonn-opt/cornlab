/**
 * histogram.js — Chart.js histogram with CI shading + mean lines
 */
const Histogram = (() => {
  let _chart = null;

  function draw(histData, stats, h0Mean) {
    const canvas = document.getElementById("hist-canvas");
    const labels = histData.edges.slice(0, -1).map((v, i) =>
      `${v.toFixed(1)}–${histData.edges[i+1].toFixed(1)}`
    );

    // CI shading via background plugin
    const ciPlugin = {
      id: "ciShade",
      beforeDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        if (!stats) return;
        const x1 = x.getPixelForValue(stats.ci_lo);
        const x2 = x.getPixelForValue(stats.ci_hi);
        ctx.save();
        ctx.fillStyle = "rgba(76,175,80,0.12)";
        ctx.fillRect(x1, y.top, x2 - x1, y.bottom - y.top);
        ctx.restore();
      },
      afterDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        // Sample mean line
        if (stats) {
          const px = x.getPixelForValue(stats.mean);
          ctx.save();
          ctx.strokeStyle = "#4caf50";
          ctx.lineWidth   = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.moveTo(px, y.top); ctx.lineTo(px, y.bottom); ctx.stroke();
          ctx.fillStyle = "#4caf50";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(`x̄=${stats.mean.toFixed(1)}`, px + 4, y.top + 14);
          ctx.restore();
        }
        // H0 mean line
        if (h0Mean !== undefined) {
          const px = x.getPixelForValue(h0Mean);
          ctx.save();
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth   = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath(); ctx.moveTo(px, y.top); ctx.lineTo(px, y.bottom); ctx.stroke();
          ctx.fillStyle = "#ffd700";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(`μ₀=${h0Mean}`, px + 4, y.top + 28);
          ctx.restore();
        }
      }
    };

    if (_chart) _chart.destroy();
    _chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Sample Yield",
          data: histData.counts,
          backgroundColor: "rgba(76,175,80,0.6)",
          borderColor:     "#4caf50",
          borderWidth: 1,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => `Yield: ${items[0].label}`,
              label: item  => `Count: ${item.raw}`,
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#81c784", font: { size: 9 }, maxRotation: 45 },
            grid:  { color: "#1a2e1a" },
          },
          y: {
            ticks: { color: "#81c784", font: { size: 10 } },
            grid:  { color: "#1a2e1a" },
            title: { display: true, text: "Count", color: "#81c784", font: { size: 10 } },
          }
        }
      },
      plugins: [ciPlugin],
    });
  }

  function clear() {
    if (_chart) { _chart.destroy(); _chart = null; }
  }

  return { draw, clear };
})();
