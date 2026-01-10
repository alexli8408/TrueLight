import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Simplified Ishihara-style test plate using colored dots
export default function IshiharaTest({ testId }) {
  const generateDots = () => {
    const dots = [];
    const size = 300;
    const radius = 150;
    const centerX = 150;
    const centerY = 150;

    // Generate background dots
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      const dotRadius = 8 + Math.random() * 8;

      // Background colors (mix of greens and browns for most tests)
      const backgroundColors = ['#90B494', '#A8C5A0', '#B8D4BB', '#8FA888'];
      const color =
        backgroundColors[Math.floor(Math.random() * backgroundColors.length)];

      dots.push(
        <Circle
          key={`bg-${i}`}
          cx={x}
          cy={y}
          r={dotRadius}
          fill={color}
          opacity={0.9}
        />
      );
    }

    // Add pattern dots based on test ID
    const patternDots = getPatternDots(testId, centerX, centerY);
    dots.push(...patternDots);

    return dots;
  };

  const getPatternDots = (testId, centerX, centerY) => {
    const dots = [];
    
    // Different patterns for different tests
    switch (testId) {
      case 1: // "12"
        // Draw "1"
        for (let i = 0; i < 15; i++) {
          dots.push(
            <Circle
              key={`pattern-1-${i}`}
              cx={centerX - 30}
              cy={centerY - 40 + i * 5}
              r={8}
              fill="#E57373"
              opacity={0.9}
            />
          );
        }
        // Draw "2"
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI;
          const r = 25;
          const x = centerX + 30 + r * Math.cos(angle);
          const y = centerY - 20 + r * Math.sin(angle);
          dots.push(
            <Circle
              key={`pattern-2-${i}`}
              cx={x}
              cy={y}
              r={8}
              fill="#E57373"
              opacity={0.9}
            />
          );
        }
        break;

      case 2: // "8"
        // Top circle of 8
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const r = 20;
          const x = centerX + r * Math.cos(angle);
          const y = centerY - 25 + r * Math.sin(angle);
          dots.push(
            <Circle
              key={`pattern-top-${i}`}
              cx={x}
              cy={y}
              r={8}
              fill="#E57373"
              opacity={0.9}
            />
          );
        }
        // Bottom circle of 8
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const r = 20;
          const x = centerX + r * Math.cos(angle);
          const y = centerY + 25 + r * Math.sin(angle);
          dots.push(
            <Circle
              key={`pattern-bottom-${i}`}
              cx={x}
              cy={y}
              r={8}
              fill="#E57373"
              opacity={0.9}
            />
          );
        }
        break;

      case 3: // "6"
        // Circle part of 6
        for (let i = 0; i < 25; i++) {
          const angle = (i / 25) * Math.PI * 2;
          const r = 25;
          const x = centerX + r * Math.cos(angle);
          const y = centerY + 15 + r * Math.sin(angle);
          dots.push(
            <Circle
              key={`pattern-circle-${i}`}
              cx={x}
              cy={y}
              r={8}
              fill="#E57373"
              opacity={0.9}
            />
          );
        }
        // Top stem of 6
        for (let i = 0; i < 15; i++) {
          dots.push(
            <Circle
              key={`pattern-stem-${i}`}
              cx={centerX + 20}
              cy={centerY - 30 + i * 3}
              r={8}
              fill="#E57373"
              opacity={0.9}
            />
          );
        }
        break;

      case 4: // "45"
        // "4"
        for (let i = 0; i < 12; i++) {
          dots.push(
            <Circle
              key={`pattern-4v-${i}`}
              cx={centerX - 30}
              cy={centerY - 30 + i * 5}
              r={8}
              fill="#E57373"
              opacity={0.9}
            />
          );
        }
        for (let i = 0; i < 8; i++) {
          dots.push(
            <Circle
              key={`pattern-4h-${i}`}
              cx={centerX - 30 + i * 5}
              cy={centerY}
              r={8}
              fill="#E57373"
              opacity={0.9}
            />
          );
        }
        // "5"
        for (let i = 0; i < 15; i++) {
          const progress = i / 15;
          let x, y;
          if (progress < 0.5) {
            x = centerX + 25;
            y = centerY - 30 + progress * 60 * 2;
          } else {
            const angle = (progress - 0.5) * 2 * Math.PI;
            x = centerX + 25 + 20 * Math.cos(angle);
            y = centerY + 20 * Math.sin(angle);
          }
          dots.push(
            <Circle
              key={`pattern-5-${i}`}
              cx={x}
              cy={y}
              r={8}
              fill="#E57373"
              opacity={0.9}
            />
          );
        }
        break;

      case 5: // "5" (blue-yellow test)
        // Use blue dots on yellow background for tritanopia test
        for (let i = 0; i < 25; i++) {
          const progress = i / 25;
          let x, y;
          if (progress < 0.3) {
            x = centerX;
            y = centerY - 30 + progress * 60 / 0.3;
          } else {
            const angle = (progress - 0.3) / 0.7 * Math.PI * 1.5 - Math.PI / 2;
            x = centerX + 25 * Math.cos(angle);
            y = centerY + 25 * Math.sin(angle);
          }
          dots.push(
            <Circle
              key={`pattern-5blue-${i}`}
              cx={x}
              cy={y}
              r={8}
              fill="#5DADE2"
              opacity={0.9}
            />
          );
        }
        break;

      default:
        break;
    }

    return dots;
  };

  return (
    <View style={styles.container}>
      <Svg height="300" width="300" viewBox="0 0 300 300">
        {generateDots()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 150,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
