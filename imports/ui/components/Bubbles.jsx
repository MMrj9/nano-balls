import React from "react";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import _ from "underscore";
import { rawToMega } from "nano-unit-converter";
import Loading from "./Loading";

const BLOCK_EXPLORER_URL = "https://www.nanolooker.com/block/";

const LIFE_TIME = 30000;
const INITIAL_RADIUS = 5;
const DIRECTIONS = [-1, 1];
const REFRESH_AVERAGE_INTERVAL = 60000;
const MAX_BUBBLES = 65;
const MIN_RADIUS = 10;
const NANO_TO_RAW = 1000000000000000000000000000000;

const getRadiusIncrement = (r1, r2) => {
  const radiusDiff = Math.abs(r2 - r1);
  if (radiusDiff > 10) return 1;
  else if (radiusDiff > 50) return 2;
  else if (radiusDiff > 100) return 3;
  else return 0.5;
};

const getRandomDirection = () => {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
};

class Bubbles extends React.Component {
  static defaultProps = {
    data: [],
  };

  constructor(props) {
    super(props);

    this.state = {
      data: [],
      bubbles: [],
      width: "100%",
      height: window.innerHeight,
      tick: new Date(),
      average: 0,
      boundaries: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    };

    this.container = React.createRef();
    this.interval = null;
    this.refreshAverageInterval = null;
    this.client = null;
    this.runningTransform = false;
  }

  componentDidMount() {
    Meteor.call("getTransactionsAmountAverage", (error, average) => {
      console.log("average", average);
      this.setState({ average });
      this.client = new W3CWebSocket("wss://ws.mynano.ninja/");
      this.client.onopen = () => {
        const subscribeMessage = {
          action: "subscribe",
          topic: "confirmation",
          ack: true,
        };
        this.client.send(JSON.stringify(subscribeMessage));
      };
      this.client.onmessage = (message) => {
        const data = JSON.parse(message.data);
        try {
          if (data && data.message) this.generateBubble(data.message);
        } catch (error) {
          return;
        }
      };
      const { speed } = this.props;
      this.interval = setInterval(
        () => !this.runningTransform && this.transformBubbles(),
        100 - speed
      );
      this.refreshAverageInterval = setInterval(
        () => this.refreshAverage(),
        REFRESH_AVERAGE_INTERVAL
      );
    });
  }

  componentWillUnmount() {
    if (this.interval && this.refreshAverageInterval) {
      clearInterval(this.interval);
      this.interval = null;
      clearInterval(this.refreshAverageInterval);
      this.refreshAverageInterval = null;
    }
  }

  componentDidUpdate(prevProps) {
    const { width, bubbles } = this.state;
    const refreshDivSizeAndBoundaries = () => {
      const width = this.container.current?.offsetWidth;
      const svgBoundingRect = this.container.current?.getBoundingClientRect();
      if (width && svgBoundingRect) {
        const boundaries = {
          top: 0,
          right: svgBoundingRect.width,
          bottom: svgBoundingRect.height,
          left: 0,
        };
        this.setState({ width, boundaries });
      }
    };
    if (isNaN(width)) {
      refreshDivSizeAndBoundaries();
      window.addEventListener("resize", () => refreshDivSizeAndBoundaries());
    }

    const { speed, showAll } = this.props;
    if (prevProps.speed !== speed) {
      clearInterval(this.interval);
      this.interval = setInterval(() => this.transformBubbles(), 100 - speed);
    }

    //Clear bubbles under 1 NANO
    if (prevProps.showAll && !showAll) {
      const updatedBubbles = [];
      bubbles.forEach((bubble) => {
        if (bubble.amount >= NANO_TO_RAW) updatedBubbles.push(bubble);
      });
      this.setState({ bubbles: updatedBubbles });
    }
  }

  refreshAverage() {
    Meteor.call("getTransactionsAmountAverage", (error, average) => {
      if (average) this.setState({ average });
    });
  }

  generateBubble(data) {
    const { showAll } = this.props;
    const { bubbles } = this.state;
    const amount = data.amount;
    if (!showAll && amount < NANO_TO_RAW) return;
    const newBubble = {
      id: data.hash,
      x: this.generateXPos(),
      y: this.generateYPos(),
      r: INITIAL_RADIUS,
      maxR: this.generateRadius(parseFloat(rawToMega(parseInt(amount)))),
      dX: getRandomDirection(),
      dY: getRandomDirection(),
      createdAt: new Date(),
      amount: amount,
      kill: false,
    };
    bubbles.push(newBubble);
    if (bubbles.length >= MAX_BUBBLES) {
      let bubblesToKill = MAX_BUBBLES - bubbles.length;
      bubbles.some((bubble, index) => {
        if (!bubble.kill) {
          bubbles[index].kill = true;
        }
        bubblesToKill -= 1;
        if (bubblesToKill === 0) return true;
      });
    }
    this.setState({ bubbles });
  }

  transformBubbles() {
    this.runningTransform = true;
    const { bubbles } = this.state;
    const updatedBubbles = [...bubbles];
    updatedBubbles.forEach((bubble, index) => {
      const lifeTime = new Date().getTime() - bubble.createdAt.getTime();
      if (lifeTime > LIFE_TIME || bubble.kill) {
        bubble.r -= getRadiusIncrement(bubble.r, 0);
      } else {
        if (bubble.r < bubble.maxR) {
          bubble.r += getRadiusIncrement(bubble.r, bubble.maxR);
        }
      }
      if (bubble.r < -1) {
        updatedBubbles.splice(index, 1);
      } else {
        const newDirection = this.generateNewDirection(bubble);
        if (newDirection) {
          bubble = { ...bubble, ...newDirection };
        } else {
          bubble.x += bubble.dX;
          bubble.y += bubble.dY;
        }
        updatedBubbles[index] = bubble;
      }
    });
    this.setState({ bubbles: updatedBubbles });
    this.runningTransform = false;
  }

  generateXPos() {
    const { width } = this.state;
    const min = INITIAL_RADIUS,
      max = width;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateYPos() {
    const { height } = this.state;
    const min = INITIAL_RADIUS,
      max = height;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateRadius(amount) {
    const { average } = this.state;
    const min = 0;
    const range = (amount - min) / (average - min);
    if (range < MIN_RADIUS) return MIN_RADIUS;
    return range;
  }

  generateNewDirection(bubble) {
    const {
      boundaries: { top, right, bottom, left },
    } = this.state;

    if (
      bubble.lastDirectionChangeTimestamp &&
      new Date() - bubble.lastDirectionChangeTimestamp < 5000
    )
      return false;

    if (bubble.x - bubble.r <= left || bubble.x + bubble.r >= right)
      return {
        dX: -bubble.dX,
        dY: getRandomDirection(),
        lastDirectionChangeTimestamp: new Date(),
      };
    else if (bubble.y - bubble.r <= top || bubble.y + bubble.r >= bottom)
      return {
        dX: getRandomDirection(),
        dY: -bubble.dY,
        lastDirectionChangeTimestamp: new Date(),
      };
    else return false;
  }

  renderBubbles() {
    const { bubbles } = this.state;
    return bubbles.map((bubble, index) => {
      const lifeTime = new Date().getTime() - bubble.createdAt.getTime();
      if (lifeTime > 3000) {
        bubble.r = bubble.r - 0.25;
        bubbles[index] = bubble;
      }
      if (bubble.r <= 0) {
        bubbles.splice(index, 1);
      }
      if (bubble.r > 0)
        return (
          <a
            key={bubble.id}
            href={`${BLOCK_EXPLORER_URL}${bubble.id}`}
            target="_blank"
          >
            <circle
              key={bubble.id}
              r={bubble.r}
              cx={bubble.x}
              cy={bubble.y}
              fill={"#111456"}
              stroke={"#fff"}
              strokeWidth="2"
            ></circle>
          </a>
        );
    });
  }

  render() {
    const { width, height, bubbles } = this.state;
    return (
      <div className="bubbles" ref={this.container}>
        <svg width={width} height={height}>
          {bubbles.length > 0 && this.renderBubbles()}
        </svg>
        {bubbles.length <= 0 && <Loading text="Waiting for transactions" />}
      </div>
    );
  }
}
export default Bubbles;
