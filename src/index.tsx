import React, {ReactNode, useState} from 'react';
import * as Haptics from 'expo-haptics';


import {
  View,
  Text,
  ScrollViewProps,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Platform
} from 'react-native';

var lastOffset = -99;

export interface Props extends ScrollViewProps {
  data: any[],
  renderItem: (item: any, index: number) => ReactNode,
  itemWidth: number,
  initialIndex?: number,
  onChange?: (position: number) => void,
  mark?: ReactNode | null,
  interpolateScale?: (index: number, itemWidth: number) => Animated.InterpolationConfigType,
  interpolateOpacity?: (index: number, itemWidth: number) => Animated.InterpolationConfigType
  style?: object,
  passToFlatList?: object
}


export default (props: Props) => {
  const {
    data,
    renderItem,
    itemWidth,
    style = {},
    passToFlatList = {},
    onChange,
    ...passedProps
  } = props;

  const scrollX = React.useRef(new Animated.Value(0)).current;
  let fixed = React.useRef(false).current;
  let timeoutFixPosition = React.useRef(setTimeout(() => {
  }, 0)).current;
  const flatListRef = React.useRef(null);
  let [paddingSide, setPaddingSide] = useState(0);

  const onLayoutScrollView = (e: LayoutChangeEvent) => {
    const {width} = e.nativeEvent.layout;
    const {itemWidth, onLayout, initialIndex} = props;
    setPaddingSide((width - itemWidth) / 2);

    if (onLayout != null) {
      
      onLayout(e);
    }
    if (initialIndex) {
      if (flatListRef && flatListRef.current) {
        // @ts-ignore
        flatListRef.current.scrollToIndex({animated: true, index: "" + initialIndex});
      }
    }
  }

  const onMomentumScrollBegin = () => {
    fixed = false;
    clearTimeout(timeoutFixPosition);
  }

  const onMomentumScrollEnd = ({nativeEvent: {contentOffset: {x}}}: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTimeout(()=> {
      const selected = Math.round(x / itemWidth);
      changePosition(selected);

    }, 0)
  }

  const onScrollBeginDrag = ({nativeEvent: {contentOffset: {x}}}: NativeSyntheticEvent<NativeScrollEvent>) => {
    lastOffset = x;
    /*  console.log("🚀🚀🚀TURBO LOG🚀🚀🚀: 👉 file: index.tsx 👉 line 82 👉 onScrollBeginDrag 👉 lastOffset", lastOffset) */
    fixed = false;
    clearTimeout(timeoutFixPosition);
  }

  const onScrollEndDrag = ({nativeEvent: {contentOffset: {x}}}: NativeSyntheticEvent<NativeScrollEvent>) => {
    /* console.log("🚀🚀🚀TURBO LOG🚀🚀🚀: 👉 file: index.tsx 👉 line 85 👉 onScrollEndDrag 👉 x", x) */
    var selected 
    
    const bias = Math.abs(x - lastOffset) < 30 ? 30 : 0

    if( x > lastOffset){

      selected = Math.round((x + bias) / itemWidth) ;
    }else{

      selected = Math.round((x - bias) / itemWidth) ;
    }
    changePosition(selected);
  }

  const changePosition = (position: number) => { 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    let fixedPosition = position;
    if (position < 0) {
      fixedPosition = 0;
    }
    if (position > data.length - 1) {
      fixedPosition = data.length - 1;
    }

    if (onChange) {
      onChange(fixedPosition);
    }
    clearTimeout(timeoutFixPosition);
    timeoutFixPosition = setTimeout(function () {
      if (!fixed && flatListRef && flatListRef.current) {
        fixed = true;
        // @ts-ignore
        flatListRef.current.scrollToIndex({animated: true,  index: "" + fixedPosition});
      }
    }, Platform.OS == "ios" ? 0 : 0);
  }
  

  return (
    <View style={{display: "flex", height: "100%", ...style}} {...passedProps}>
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center'
      }}>
        {typeof props.mark === "undefined" ? DefaultMark : props.mark}
      </View>
      <Animated.FlatList
        snapToInterval={4}
        disableIntervalMomentum={true}
        ref={process.env.NODE_ENV === 'test' ? null : flatListRef}
        onLayout={onLayoutScrollView}
        onScroll={Animated.event([{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: true})}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(_item, index) => index.toString()}
        /* onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumScrollEnd} */
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        contentContainerStyle={{
          paddingHorizontal: paddingSide, display: "flex", alignItems: "center", backgroundColor: 'transparent'
        }}
        initialNumToRender={30}
        {...passToFlatList}
        renderItem={({item, index}) => {
          const {itemWidth, interpolateScale, interpolateOpacity} = props;

          const scale = scrollX.interpolate(interpolateScale ?
            interpolateScale(index, itemWidth) :
            defaultScaleConfig(index, itemWidth));

          const opacity = scrollX.interpolate(interpolateOpacity ?
            interpolateOpacity(index, itemWidth) :
            defaultOpacityConfig(index, itemWidth));

          const rotation = scrollX.interpolate(
            defaultRotationConfig(index, itemWidth));
          const rotation2 = scrollX.interpolate(
            defaultRotationConfig2(index, itemWidth));

          const translateY = scrollX.interpolate(
            defaultTranslateConfig(index, itemWidth)
          )
          return (
            <View  key={index}>
              <Animated.View style={{transform: [{scale}, {rotateZ:rotation2 },{rotateY:rotation }, { translateY}], opacity}}>
                {renderItem(item, index)}
              </Animated.View>
            </View>
          )
        }} />
    </View>
  );
}
  

const DefaultMark =
  <Text style={{
    color: "black",
    fontWeight: "bold",
    paddingTop: 60
  }}>^</Text>;

const defaultScaleConfig = (index: number, itemWidth: number) => ({
  inputRange: [
    itemWidth * (index - 2),
    itemWidth * (index - 1),
    itemWidth * index,
    itemWidth * (index + 1),
    itemWidth * (index + 2),
  ],
  outputRange: [0.8, 0.92, 1, 0.92, 0.8]
});

const defaultOpacityConfig = (index: number, itemWidth: number) => ({
  inputRange: [
    itemWidth * (index - 2),
    itemWidth * (index - 1),
    itemWidth * index,
    itemWidth * (index + 1),
    itemWidth * (index + 2),
  ],
  outputRange: [-0.4, 0.9, 1, 0.9, -0.4]
});


const defaultRotationConfig = (index: number, itemWidth: number) => ({
  inputRange: [
    itemWidth * (index - 2),
    itemWidth * (index - 1),
    itemWidth * index,
    itemWidth * (index + 1),
    itemWidth * (index + 2),
  ],
  outputRange: ['30deg', '10deg', '0deg', '-10deg', '-30deg'],
  
});
const defaultRotationConfig2 = (index: number, itemWidth: number) => ({
  inputRange: [
    itemWidth * (index - 2),
    itemWidth * (index - 1),
    itemWidth * index,
    itemWidth * (index + 1),
    itemWidth * (index + 2),
  ],
  outputRange: ['20deg', '1deg', '0deg', '-1deg', '-20deg'],
  
});

const defaultTranslateConfig = (index: number, itemWidth: number) => ({
  inputRange: [
    itemWidth * (index - 2),
    itemWidth * (index - 1),
    itemWidth * index,
    itemWidth * (index + 1),
    itemWidth * (index + 2),
  ],
  outputRange: [18, 3, 0, 3, 18]
});
