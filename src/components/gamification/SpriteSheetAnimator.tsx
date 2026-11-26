import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, AccessibilityInfo, type ImageSourcePropType } from 'react-native';

interface SpriteSheetAnimatorProps {
  frames: ImageSourcePropType[];
  fps?: number;
  loop?: boolean;
  size?: number;
  flipX?: boolean;
  paused?: boolean;
  onComplete?: () => void;
  style?: any;
}

export function SpriteSheetAnimator({
  frames,
  fps = 10,
  loop = true,
  size = 128,
  flipX = false,
  paused = false,
  onComplete,
  style,
}: SpriteSheetAnimatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    setFrameIndex(0);
  }, [frames]);

  useEffect(() => {
    if (paused || reduceMotion || frames.length <= 1) {
      if (!loop && reduceMotion) {
        onCompleteRef.current?.();
      }
      return;
    }

    const intervalMs = Math.max(30, Math.round(1000 / fps));
    let current = 0;

    const timer = setInterval(() => {
      current += 1;
      if (current >= frames.length) {
        if (loop) {
          current = 0;
          setFrameIndex(0);
        } else {
          clearInterval(timer);
          onCompleteRef.current?.();
        }
      } else {
        setFrameIndex(current);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [frames, fps, loop, paused, reduceMotion]);

  if (!frames || frames.length === 0) return null;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          position: 'relative',
          transform: flipX ? [{ scaleX: -1 }] : undefined,
        },
        style,
      ]}
    >
      {frames.map((src, idx) => (
        <Image
          key={idx}
          source={src}
          style={[
            styles.frameImg,
            {
              width: size,
              height: size,
              opacity: idx === frameIndex ? 1 : 0,
            },
          ]}
          resizeMode="contain"
          fadeDuration={0}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frameImg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
