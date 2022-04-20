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
const MAX_BALLS = 65;
const MIN_RADIUS = 10;
const MAX_RADIUS = 400;
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

class Balls extends React.Component {
  static defaultProps = {
    data: [],
  };

  constructor(props) {
    super(props);

    this.state = {
      data: [],
      balls: [],
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
    this.isMutating = false;
    this.largestTransactionAmount = props.largestTransactionAmount;
  }

  componentDidMount() {
    Meteor.call("getTransactionsAmountAverage", (error, average) => {
      this.setState({ average });
      this.client = new W3CWebSocket("wss://ws.powernode.cc/");
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
          if (data && data.message) this.generateBall(data.message);
        } catch (error) {
          return;
        }
      };
      const { speed } = this.props;
      this.interval = setInterval(
        () => !this.isMutating && this.transformBalls(),
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
    const { width, balls } = this.state;
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

    const { speed, showAll, largestTransactionAmount } = this.props;
    if (prevProps.speed !== speed) {
      clearInterval(this.interval);
      this.interval = setInterval(() => this.transformBalls(), 100 - speed);
    }

    //Clear balls under 1 NANO
    if (prevProps.showAll && !showAll) {
      const updatedBalls = [];
      balls.forEach((ball) => {
        if (ball.amount >= NANO_TO_RAW) updatedBalls.push(ball);
      });
      this.setState({ balls: updatedBalls });
    }

    //Set this.largestTransactionAmount
    if (
      largestTransactionAmount &&
      this.largestTransactionAmount !== largestTransactionAmount
    )
      this.largestTransactionAmount = largestTransactionAmount;
  }

  refreshAverage() {
    Meteor.call("getTransactionsAmountAverage", (error, average) => {
      if (average) this.setState({ average });
    });
  }

  generateBall(data) {
    this.isMutating = true;
    const { showAll } = this.props;
    const { balls } = this.state;
    const amount = data.amount;
    if (!showAll && amount < NANO_TO_RAW) {
      this.isMutating = false;
      return;
    }
    const newBall = {
      id: data.hash,
      subtype: data.block.subtype,
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
    balls.push(newBall);
    if (balls.length >= MAX_BALLS) {
      let ballsToKill = balls.length - MAX_BALLS;
      balls.some((ball, index) => {
        if (!ball.kill) {
          balls[index].kill = true;
        }
        ballsToKill -= 1;
        if (ballsToKill <= 0) return true;
      });
    }
    this.setState({ balls });
    this.isMutating = false;
  }

  transformBalls() {
    this.isMutating = true;
    const { balls } = this.state;
    const updatedBalls = [...balls];
    updatedBalls.forEach((ball, index) => {
      const lifeTime = new Date().getTime() - ball.createdAt.getTime();
      if (lifeTime > LIFE_TIME || ball.kill) {
        ball.r -= getRadiusIncrement(ball.r, 0);
      } else {
        if (ball.r < ball.maxR) {
          ball.r += getRadiusIncrement(ball.r, ball.maxR);
        }
      }
      if (ball.r < -1) {
        updatedBalls.splice(index, 1);
      } else {
        const newDirection = this.generateNewDirection(ball);
        if (newDirection) {
          ball = { ...ball, ...newDirection };
        } else {
          ball.x += ball.dX;
          ball.y += ball.dY;
        }
        updatedBalls[index] = ball;
      }
    });
    this.setState({ balls: updatedBalls });
    this.isMutating = false;
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
    let radius = (amount * MAX_RADIUS) / this.largestTransactionAmount;
    if (radius < MIN_RADIUS) radius = MIN_RADIUS;
    if (amount >= average && radius < MIN_RADIUS * 2) return MIN_RADIUS * 2;
    return radius;
  }

  generateNewDirection(ball) {
    const {
      boundaries: { top, right, bottom, left },
    } = this.state;

    if (
      ball.lastDirectionChangeTimestamp &&
      new Date() - ball.lastDirectionChangeTimestamp < 5000
    )
      return false;

    if (ball.x - ball.r <= left || ball.x + ball.r >= right)
      return {
        dX: -ball.dX,
        dY: getRandomDirection(),
        lastDirectionChangeTimestamp: new Date(),
      };
    else if (ball.y - ball.r <= top || ball.y + ball.r >= bottom)
      return {
        dX: getRandomDirection(),
        dY: -ball.dY,
        lastDirectionChangeTimestamp: new Date(),
      };
    else return false;
  }

  renderBalls() {
    const { balls } = this.state;
    return balls.map((ball, index) => {
      const lifeTime = new Date().getTime() - ball.createdAt.getTime();
      if (lifeTime > 3000) {
        ball.r = ball.r - 0.25;
        balls[index] = ball;
      }
      if (ball.r <= 0) {
        balls.splice(index, 1);
      }
      if (ball.r > 0)
        return (
          <a
            key={ball.id}
            href={`${BLOCK_EXPLORER_URL}${ball.id}`}
            target="_blank"
          >
            <circle
              key={ball.id}
              r={ball.r}
              cx={ball.x}
              cy={ball.y}
              fill={ball.subtype === "send" ? "#111456" : "#1e2396"}
              stroke={"#fff"}
              strokeWidth="2"
            ></circle>
          </a>
        );
    });
  }

  render() {
    const { width, height, balls } = this.state;
    return (
      <div className="balls" ref={this.container}>
        <svg width={width} height={height}>
          {balls.length > 0 && this.renderBalls()}
        </svg>
        {balls.length <= 0 && <Loading text="Waiting for transactions" />}
      </div>
    );
  }
}
export default Balls;
