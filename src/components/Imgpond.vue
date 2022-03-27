<template>
  <div class="multiple-files">
    <el-upload
      ref="element-upload"
      action="#"
      :auto-upload="false"
      list-type="picture-card"
      :file-list="files"
      :on-change="onChange"
      :on-preview="onActivatefile"
      :on-remove="onRemove"
      :http-request="httpRequest"
    >
      <i class="el-icon-plus" />
    </el-upload>

    <ImgCropper
      :show.sync="cropper.show"
      :file="cropper.file"
      aspectRatio="1/1"
      :aspectRatioDeviation="0.1"
      @confirm="onCropperConfirm"
      @cancel="onCropperCancel"
      @close="onCropperClose"
      @open="onCropperOpen"
      @closed="onCropperClosed"
    />
    <!--  confirm、cancel、close、open、closed 事件最后都是注册到弹框上-->
  </div>
</template>
<script>
import ImgCropper from "./ImgCropper.vue";
import { aspectRatioToText, file2Base64, isArrayJSON } from "../utils";
import axios from "axios";
export default {
  name: "Imgpond",
  components: {
    ImgCropper,
  },
  data() {
    return {
      files: [
        {
          url: "https://placem.at/people?random=1&txt=0&w=500&h=500",
        },
        {
          url: "https://placem.at/people?random=1&txt=0&w=1000&h=500",
        },
      ],
      cropper: {
        show: false,
        file: null,
        loading: false,
        submitted: false,
      },
    };
  },
  methods: {
    // 选择图片触发
    onChange(file, fileList) {
      if (file.status === "ready") {
        console.log(fileList, "fileList");
        this.beforeAddFile({
          ...file,
          file: file.raw,
          fileList,
        });
        // this.beforeAddFile({
        //   ...file,
        //   file: file.raw,
        //   fileList,
        // });
      } else {
        // this.emitChange(fileList);
      }
    },
    // 添加图片之前进入裁减环节
    beforeAddFile(item) {
      if (item.file instanceof File) {
        if (this.cropper.show) {
          return;
        }
        this.cropper.file = item.file;
        this.cropper.show = true;
      }
    },
    // 点击预览
    onActivatefile(file) {
      for (let [i, v] of this.files.entries()) {
        if (v.url === file.url) {
          this.preview(i);
          break;
        }
      }
      // this.$emit("preview", file);
    },
    // 预览图片
    preview(index) {
      this.$viewerApi({
        options: {
          toolbar: true,
          initialViewIndex: index,
        },
        images: this.files.map((v) => v.url),
      });
    },
    // 删除图片
    onRemove(file, fileList) {
      this.files.splice(fileList.indexOf(file), 1);
    },
    // 请求成功
    onSuccess(response, file, fileList) {
      file.progress = 100;
      file.url = response;
      this.files.push(file);
    },
    // 调接口进行后台裁减图片
    uploadImg(file) {
      debugger;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dir", "img");
      formData.append("domainId", "3");
      formData.append("original", "true");
      return axios
        .post("https://www.lanshan-h5.cn:1443/node//upload", formData, {
          timeout: 20000,
        })
        .then((res) => {
          return res.data.data;
        })
        .catch((e) => {
          reject(e);
        });
    },
    // 发送请求回调
    async httpRequest(item) {
      // 调后台接口进行裁减处理
      // const result = await this.uploadImg(item.file);
      // this.onSuccess(result, item.file);

      // 2.本地展示
      file2Base64(item.file, (base64) => {
        this.onSuccess(base64, item.file);
      });
    },
    // 取消裁减
    onCropperCancel(isCancel = true) {
      this.cropper.show = false;
    },
    // 确定裁减
    onCropperConfirm(blob) {
      const elementUpload = this.$refs["element-upload"];
      // 裁剪了
      if (blob) {
        // 将Blob文件转换成File格式
        let file = new File([blob], this.cropper.file.name, {
          type: blob.type,
        });
        let uploadFiles =
          elementUpload.uploadFiles[elementUpload.uploadFiles.length - 1];
        file.uid = uploadFiles.raw.uid; //uid影响progress等回调的判断
        uploadFiles.raw = file;
      }
      elementUpload.submit();
      this.cropper.submitted = true;
      this.onCropperCancel(false);
    },
    // 弹框关闭
    onCropperClose() {
      const uploadFiles = this.$refs["element-upload"].uploadFiles;
      uploadFiles.splice(uploadFiles.indexOf(this.cropper.file), 1);
      !this.cropper.submitted && this.$refs["element-upload"].submit();
      this.cropper.file = null;
      this.cropper.submitted = false;
    },
    onCropperClosed() {
      this.$refs["element-upload"].$refs["upload-inner"].$el.focus();
    },
    onCropperOpen() {
      this.$refs["element-upload"].$refs["upload-inner"].$el.blur();
    },
  },
};
</script>
<style lang="css" scoped>
::v-deep .el-dialog {
  min-width: 750px;
}

::v-deep .filepond--item {
  width: calc(33.33% - 0.5em);
}

::v-deep .filepond--file {
  cursor: pointer;
  transition-duration: 0.3s;
}

::v-deep .filepond--file:hover {
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.9);
  filter: blur(1px);
  background: hsla(0, 0%, 100%, 0.3);
}

::v-deep .el-upload-list__item {
  user-select: none;
  transition: none !important;
}
::v-deep .el-upload-list__item .el-upload-list__item-thumbnail {
  object-fit: contain;
}

::v-deep .multiple-files .el-upload-list__item-actions {
  cursor: grab;
}

.full ::v-deep .el-upload--picture-card {
  display: none;
}

::v-deep .el-upload--picture-card {
  position: relative;
}
::v-deep .el-upload--picture-card .el-upload__text {
  position: absolute;
  top: 85px;
  width: 100%;
  color: rgba(33, 150, 243, 0.8);
  line-height: 20px;
}

.preview-img {
  background-color: rgba(0, 0, 0, 0.5);
}

/*.filepond--fullsize-overlay {
  z-index: 9999;
}*/

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

::v-deep .rotateDegree.el-slider .el-slider__runway.show-input {
  margin-right: 130px;
}

::v-deep .rotateDegree.el-slider .el-slider__marks-text:last-child {
  width: 36.406px;
}

::v-deep .rotateDegree.el-slider .el-slider__input {
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

<style>
.cursor-grabbing *,
.cursor-grabbing .multiple-files .el-upload-list__item-actions {
  cursor: grabbing;
}
</style>
