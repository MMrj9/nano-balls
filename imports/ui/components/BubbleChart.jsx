import React from "react";
import * as d3 from "d3";
import _ from "underscore";
import { numberWithCommas } from "../utils/numbers";
import Loading from "./Loading";

const BLOCK_EXPLORER_URL = "https://www.nanolooker.com/block/";

class BubbleChart extends React.Component {
  static defaultProps = {
    data: [],
  };

  constructor(props) {
    super(props);

    this.minValue = 1;
    this.maxValue = 100;
    this.mounted = false;
    this.disableRefresh = false;

    this.state = {
      data: [],
      width: "100%",
      height: window.innerHeight,
      currentTxs: [],
      lastGenerateRun: null,
      forceGenerate: true,
    };

    this.radiusScale = this.radiusScale.bind(this);
    this.simulatePositions = this.simulatePositions.bind(this);
    this.renderBubbles = this.renderBubbles.bind(this);

    this.container = React.createRef();
  }

  componentWillMount() {
    this.mounted = true;
    window.addEventListener("resize", () => {
      if (this.container?.current) {
        const width = this.container.current.offsetWidth;
        this.setState({ lastGenerateRun: new Date(), width });
        this.generateChart();
      }
    });
  }

  componentDidUpdate(prevProps) {
    const { data, limit, timePeriod } = this.props;
    const { currentTxs, lastGenerateRun } = this.state;
    let { forceGenerate } = this.state;
    const newTxs = data.map((item) => item.hash);
    if (prevProps.limit !== limit || prevProps.timePeriod !== timePeriod) {
      forceGenerate = true;
    }
    if (!_.isEqual(currentTxs, newTxs) || forceGenerate) {
      var secondsSinceLastGenerateRun =
        (new Date().getTime() - lastGenerateRun.getTime()) / 1000;
      if (
        !forceGenerate &&
        !this.disableRefresh &&
        secondsSinceLastGenerateRun &&
        secondsSinceLastGenerateRun < 10
      ) {
        this.disableRefresh = true;
        setTimeout(() => {
          this.disableRefresh = false;
          this.setState({ forceGenerate: true });
        }, (10 - secondsSinceLastGenerateRun) * 1000);
      } else {
        this.setState({
          currentTxs: newTxs,
          forceGenerate: false,
          lastGenerateRun: new Date(),
        });
        this.generateChart();
      }
    }
  }

  componentDidMount() {
    const { data } = this.props;
    const currentTxs = data.map((item) => item.hash);
    const width = this.container.current.offsetWidth;
    this.setState({ currentTxs, lastGenerateRun: new Date(), width });
    this.generateChart();
  }

  generateChart() {
    const { data } = this.props;
    if (data.length > 0) {
      this.minValue = d3.min(data, (item) => {
        return item.v;
      });

      this.maxValue = d3.max(data, (item) => {
        return item.v;
      });

      this.simulatePositions(data);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  radiusScale = (value) => {
    const fx = d3
      .scaleSqrt()
      .range([20, 200])
      .domain([this.minValue, this.maxValue]);

    return fx(value);
  };

  simulatePositions = (data) => {
    this.simulation = d3
      .forceSimulation()
      .nodes(data)
      .velocityDecay(0.5)
      .force("x", d3.forceX().strength(0.05))
      .force("y", d3.forceY().strength(0.05))
      .force(
        "collide",
        d3.forceCollide((d) => {
          return this.radiusScale(d.v) + 2;
        })
      )
      .on("tick", () => {
        if (this.mounted) {
          this.setState({ data });
        }
      });
  };

  renderBubbles = (data) => {
    const minValue = d3.min(data, (item) => {
      return item.v;
    });

    const maxValue = d3.max(data, (item) => {
      return item.v;
    });

    const color = d3
      .scaleLinear()
      .domain([minValue, maxValue])
      .interpolate(d3.interpolateHcl)
      .range(["#3582de", "#1f69c1"]);

    const circles = data.map((item, index) => {
      const radius = this.radiusScale(item.v);
      if (radius > 0)
        return (
          <a
            key={item.hash}
            href={`${BLOCK_EXPLORER_URL}${item.hash}`}
            target="_blank"
          >
            <circle
              key={index}
              r={radius}
              cx={item.x}
              cy={item.y}
              fill={color(item.v)}
              stroke={"#fff"}
              strokeWidth="2"
            />

            <text
              x={item.x}
              y={item.y}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={this.radiusScale(item.v) / 2.2}
            >
              {`${numberWithCommas(Math.round(item.amountNano))}₦`}
            </text>
          </a>
        );
    });

    const { width, height } = this.state;
    return (
      <g transform={`translate(${width / 2}, ${height / 2})`}>{circles}</g>
    );
  };

  render() {
    const { loading } = this.props;
    const { width, height, data } = this.state;
    return (
      <div className="chart" ref={this.container}>
        <svg width={width} height={height}>
          {!loading && this.renderBubbles(data)}
        </svg>
        {loading && <Loading text="Fetching data" />}
      </div>
    );
  }
}
export default BubbleChart;
