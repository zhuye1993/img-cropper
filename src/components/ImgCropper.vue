<template>
  <el-dialog
    title="编辑图片"
    :visible="show"
    @close="$emit('update:show', false)"
    :close-on-click-modal="false"
    :append-to-body="true"
    destroy-on-close
    v-on="$listeners"
  >
    <vue-cropper
      overflow-hidden
      v-loading="loading"
      ref="cropper"
      :src="src"
      :containerStyle="containerStyle"
      preview=".preview"
      :minContainerHeight="500"
      background
      :ready="onReady"
      :cropmove="touch"
      :zoom="touch"
    />

    <div flex flex-col items-center mt-40px gap-10px>
      <el-button-group>
        <el-button @click.prevent="zoom(0.2)" icon="el-icon-zoom-in" />
        <el-button @click.prevent="zoom(-0.2)" icon="el-icon-zoom-out" />
        <el-button @click.prevent="move(-10, 0)" icon="el-icon-arrow-left" />
        <el-button @click.prevent="move(10, 0)" icon="el-icon-arrow-right" />
        <el-button @click.prevent="move(0, -10)" icon="el-icon-arrow-up" />
        <el-button @click.prevent="move(0, 10)" icon="el-icon-arrow-down" />
        <el-button
          ref="flipX"
          @click.prevent="flipX"
          class="flipX"
          icon="el-icon-sort"
        />
        <el-button ref="flipY" @click.prevent="flipY" icon="el-icon-sort" />
        <el-button @click.prevent="rotate(90)" icon="el-icon-refresh-right" />
        <el-button @click.prevent="rotate(-90)" icon="el-icon-refresh-left" />
        <el-button type="info" @click.prevent="reset" icon="el-icon-refresh" />
      </el-button-group>

      <el-slider
        class="rotateDegree"
        v-model="rotateDegree"
        show-input
        :min="-180"
        :max="180"
        :marks="{
          '0': '0°',
          '-180': '-180°',
          '180': '180°',
        }"
        @change="onRotateDegreeChange"
      />
    </div>

    <div slot="footer" flex items-center justify-end>
      <el-form inline flex v-show="mustCrop">
        <el-form-item v-if="isLargeResolution">
          <template slot="label">
            最大分辨率
            <el-tooltip effect="dark" placement="top">
              <div slot="content">
                调低该值可缩小图片体积<br />
                调高该值可提升清晰度
              </div>
              <i class="el-icon-question" />
            </el-tooltip>
          </template>
          <el-input-number
            class="maxResolution"
            v-model="maxResolution"
            :min="0"
            :step="128"
            size="mini"
          />
        </el-form-item>

        <el-form-item>
          <template slot="label">
            品质
            <el-tooltip effect="dark" placement="top">
              <div slot="content">
                调低该值可缩小图片体积<br />
                调高该值可提升清晰度
              </div>
              <i class="el-icon-question" />
            </el-tooltip>
          </template>
          <el-slider
            class="quality"
            v-model="quality"
            :min="0"
            :max="1"
            :step="0.1"
            size="mini"
          />
        </el-form-item>
      </el-form>

      <el-button style="margin-left: 20px" type="info" @click="reset"
        >重 置</el-button
      >
      <el-button
        @click="
          () => {
            $emit('cancel');
          }
        "
        >取 消</el-button
      >
      <el-button type="primary" :loading="submitting" @click="onConfirm">
        确 定
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import "cropperjs/dist/cropper.css";
import VueCropper from "vue-cropperjs";
import { file2Base64, aspectRatioToText, sizeToText, KB, MB } from "../utils";
import { throttle } from "lodash-es";

const LARGE_RESOLUTION = 2560;
const SIZE_THRESHOLD = MB;

const initialSettings = () => ({
  containerStyle: {
    height: "500px",
  },
  rotateDegree: 0,
  maxResolution: LARGE_RESOLUTION,
  quality: 1,
  isTouched: false,
});

const initialState = () => ({
  ...initialSettings(),
  loading: true,
  aspectRatioMismatched: false,
  submitting: false,
  src: "",
  sizeText: "",
  isLargeResolution: false,
  canvas: {},
  cropBox: {},
});

export default {
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    file: File,
    aspectRatio: [Array, String],
    aspectRatioDeviation: Number,
  },
  components: {
    VueCropper,
  },
  data() {
    return initialState();
  },
  computed: {
    aspectRatioText() {
      return aspectRatioToText(this.aspectRatioValue);
    },
    // 是否必须裁减
    mustCrop() {
      return this.aspectRatioMismatched || this.isTouched;
    },
    // 图片的比例值
    aspectRatioValue() {
      if (this.aspectRatio) {
        if (typeof this.aspectRatio === "string") {
          const [width, height] = this.aspectRatio.split("/");
          return width / height;
        }
      }
    },
  },
  watch: {
    // 监听文件变化
    async file(n, o) {
      if (n) {
        if (this.aspectRatioValue) {
          this.aspectRatioMismatched = await this.checkAspectRatio(n);
        }
        this.sizeText = sizeToText(n.size);
        file2Base64(n, (base64) => {
          // 获取图片尺寸，如果是大图，则提供最大分辨率的配置
          const image = new Image();
          image.onload = () => {
            const { width, height } = image;
            this.isLargeResolution =
              width >= LARGE_RESOLUTION || height >= LARGE_RESOLUTION;
          };
          image.src = base64;
          this.src = base64;
          this.$refs.cropper.replace(base64); // replace 后触发 onReady
        });
      } else {
        Object.assign(this.$data, initialState());
      }
    },
  },
  methods: {
    // 旋转图片
    onRotateDegreeChange(n) {
      this.touch();
      // 大图会卡，加一个节流
      if (!this.updateCropBox) {
        this.updateCropBox = throttle(
          (n) => {
            this.$refs.cropper.rotateTo(n);
            this.$nextTick(() => {
              const {
                width,
                height,
                left,
                top,
              } = this.$refs.cropper.getCanvasData();
              this.$refs.cropper.setCropBoxData({ width, height, left, top });
            });
          },
          Math.min(300, Math.round(this.file.size / KB)),
          {
            leading: false,
            trailing: true,
          }
        );
      }

      // 避免 this.file.size 报错
      if (this.file) {
        this.updateCropBox(n);
      }
    },
    getSizeDiffText(before, after) {
      const diff = after - before;
      let textA = `原图体积 ${sizeToText(before)}，编辑后 ${sizeToText(after)}`,
        textB = diff === 0 ? "" : `${((diff / before) * 100).toFixed(2)}%`;
      if (diff > 0) {
        textB = "+" + textB;
      }
      if (textB) {
        textB = `（${textB}）`;
      }
      return textA + textB;
    },
    // 检查图片真实比例是否为1:1,aspectRatioDeviation:0.1(误差不超过0.1)
    checkAspectRatio(file) {
      return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
          const image = new Image();
          image.onload = () => {
            const originalRatio = image.width / image.height;
            resolve(
              originalRatio <
                this.aspectRatioValue * (1 - this.aspectRatioDeviation) ||
                originalRatio >
                  this.aspectRatioValue * (1 + this.aspectRatioDeviation)
            );
          };
          image.src = e.target.result;
        };
        // 将file文件转换成base64
        fileReader.readAsDataURL(file);
      });
    },
    onConfirm() {
      if (this.mustCrop) {
        this.submitting = true;
        this.$refs.cropper
          .getCroppedCanvas({
            // 限制画布大小，限制生成的图片体积
            maxWidth: this.maxResolution,
            maxHeight: this.maxResolution,
          })
          .toBlob(
            (blob) => {
              const sizeDiffText = this.getSizeDiffText(
                this.file.size,
                blob.size
              );
              console.log(sizeDiffText);
              this.$emit("confirm", blob);
              this.submitting = false;
            },
            // 如果旋转角度不为直角，则图片一定会出现空白区域，空白区域默认透明，使用 png 格式
            //this.rotateDegree % 90 === 0 ? this.file.type : 'image/png',
            this.file.type,
            // 质量
            this.quality
          );
      } else {
        this.$emit("confirm");
      }
    },
    // 改变了图片，需要裁减图片
    touch() {
      this.isTouched = true;
    },
    // 设置裁减的比列为1:1
    onReady() {
      const { width, height, left, top } = this.$refs.cropper.getCanvasData();
      //this.canvas = { width, height, left, top }
      if (typeof this.aspectRatioValue === "number") {
        this.$refs.cropper.setAspectRatio(this.aspectRatioValue);

        this.$nextTick(() => {
          // 默认裁剪框在图片之内（避免裁剪出白边），也可以放大以完全框住图片（避免遗漏信息）
          const originalRatio = width / height;
          //this.cropBox = this.$refs.cropper.getCropBoxData()
          if (this.aspectRatioValue > originalRatio) {
            this.$refs.cropper.setCropBoxData({ width, left });
            const {
              width: containerWidth,
              height: containerHeight,
            } = this.$refs.cropper.getContainerData();
            const {
              width: cropBoxWidth,
              height: cropBoxHeight,
            } = this.$refs.cropper.getCropBoxData(); // 不能提前拿
            this.$refs.cropper.setCropBoxData({
              top: (containerHeight - cropBoxHeight) / 2,
            });
          } else {
            this.$refs.cropper.setCropBoxData({ height, top });
            const {
              width: containerWidth,
              height: containerHeight,
            } = this.$refs.cropper.getContainerData();
            const {
              width: cropBoxWidth,
              height: cropBoxHeight,
            } = this.$refs.cropper.getCropBoxData(); // 不能提前拿
            this.$refs.cropper.setCropBoxData({
              left: (containerWidth - cropBoxWidth) / 2,
            });
          }
          this.loading = false;
        });
      } else {
        //this.cropBox = { ...this.canvas }
        this.$refs.cropper.setCropBoxData({ width, height, left, top });
        this.loading = false;
      }
    },
    // 横向翻转
    flipX() {
      this.touch();
      const dom = this.$refs.flipX.$el;
      let scale = dom.getAttribute("data-scale");
      scale = scale ? -scale : -1;
      this.$refs.cropper.scaleX(scale);
      dom.setAttribute("data-scale", scale);
    },
    // 竖向翻转
    flipY() {
      this.touch();
      const dom = this.$refs.flipY.$el;
      let scale = dom.getAttribute("data-scale");
      scale = scale ? -scale : -1;
      this.$refs.cropper.scaleY(scale);
      dom.setAttribute("data-scale", scale);
    },
    // 移动
    move(offsetX, offsetY) {
      this.touch();
      this.$refs.cropper.move(offsetX, offsetY);
    },
    // 重置
    reset() {
      Object.assign(this.$data, initialSettings());
      this.$refs.cropper.reset();
      this.onReady();
    },
    // 旋转角度
    rotate(deg) {
      const sum = this.rotateDegree + deg;
      if (sum > 180) {
        this.rotateDegree = sum - 360;
      } else if (sum < -180) {
        this.rotateDegree = sum + 360;
      } else {
        this.rotateDegree = sum;
      }
      this.onRotateDegreeChange(this.rotateDegree);
      //this.$refs.cropper.rotate(deg)
    },
    // 放大缩小
    zoom(percent) {
      this.$refs.cropper.relativeZoom(percent);
    },
  },
};
</script>

<style lang="css" scoped>
::v-deep .flipX > .el-icon-sort {
  transform: rotate(90deg);
}

::v-deep .cropper-point {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50%;
}

.rotateDegree.el-slider {
  width: 551px;
}
::v-deep .el-slider__runway.show-input {
  margin-right: 130px;
}

::v-deep .el-slider__marks-text:last-child {
  width: 36.406px;
}

::v-deep .el-slider__input {
  width: 105px;
}

.maxResolution.el-input-number {
  width: 105px;
}

.quality.el-slider {
  width: 75px;
}

::v-deep .el-form-item__label-wrap {
  margin-left: unset !important;
}

.el-form-item {
  margin-bottom: unset;
}

::v-deep .cropper-hidden {
  display: none !important;
  max-height: 100% !important;
}
</style>
