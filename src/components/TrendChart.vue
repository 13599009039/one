<template>
  <div ref="chartRef" class="trend-chart"></div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  // 图表数据
  data: {
    type: Array,
    default: () => []
  },
  // 图表类型: line(折线图) | bar(柱状图)
  type: {
    type: String,
    default: 'line'
  },
  // 图表标题
  title: {
    type: String,
    default: ''
  },
  // 图表高度
  height: {
    type: String,
    default: '300px'
  },
  // Y轴单位
  unit: {
    type: String,
    default: ''
  },
  // 颜色
  color: {
    type: String,
    default: '#7c3aed'
  },
  // 是否显示区域填充（仅折线图）
  showArea: {
    type: Boolean,
    default: true
  }
})

const chartRef = ref(null)
let chartInstance = null

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  // 销毁已有实例
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  // 创建新实例
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

// 更新图表
const updateChart = () => {
  if (!chartInstance || !props.data || props.data.length === 0) return
  
  // 提取日期和数值
  const dates = props.data.map(item => {
    // 格式化日期显示
    const date = item.date
    if (date.length === 10) {
      // YYYY-MM-DD → MM-DD
      return date.substring(5)
    } else if (date.length === 7) {
      // YYYY-MM → MM月
      return date.substring(5) + '月'
    }
    return date
  })
  
  const values = props.data.map(item => item.value)
  
  // 配置项
  const option = {
    title: {
      text: props.title,
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal',
        color: '#666'
      }
    },
    grid: {
      left: '10%',
      right: '5%',
      top: '20%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#e5e7eb'
        }
      },
      axisLabel: {
        color: '#9ca3af',
        fontSize: 11,
        rotate: dates.length > 15 ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#f3f4f6',
          type: 'dashed'
        }
      },
      axisLabel: {
        color: '#9ca3af',
        fontSize: 11,
        formatter: (value) => {
          if (value >= 10000) {
            return (value / 10000).toFixed(1) + 'w'
          }
          return value
        }
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderWidth: 0,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: (params) => {
        const param = params[0]
        let value = param.value
        if (props.unit === '¥') {
          value = '¥' + value.toFixed(2)
        }
        return `${param.axisValue}<br/>${param.marker}${props.title}: ${value}`
      }
    },
    series: [
      {
        type: props.type,
        data: values,
        smooth: props.type === 'line',
        lineStyle: {
          width: 3,
          color: props.color
        },
        itemStyle: {
          color: props.color
        },
        areaStyle: props.type === 'line' && props.showArea ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: props.color + '33' // 20% opacity
              },
              {
                offset: 1,
                color: props.color + '00' // 0% opacity
              }
            ]
          }
        } : null,
        emphasis: {
          focus: 'series'
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

// 响应式resize
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 监听数据变化
watch(() => props.data, () => {
  nextTick(() => {
    updateChart()
  })
}, { deep: true })

// 监听其他props变化
watch([() => props.type, () => props.title, () => props.color], () => {
  nextTick(() => {
    updateChart()
  })
})

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

// 组件销毁时清理
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.trend-chart {
  width: 100%;
  height: v-bind(height);
  min-height: 250px;
}
</style>
