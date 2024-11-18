import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSM } from "three/examples/jsm/csm/CSM.js";
import { TreeBuilder } from "./TreeBuilder"; // 替换为你的 TreeBuilder 路径
import { CustomizeTree } from "./CustomizeTree"; // 替换为你的 CustomizeTree 路径
import { LeafGeometry } from "./leaf_flower_fruit/LeafGeometry"; // 用于生成叶子的几何体

const ThreeScene = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    // 初始化场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(30, 50, 50); // 修改相机位置
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // 确保相机对准中心


    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 10, 0);
    controls.update();

    // 添加环境光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(-10, 20, -10); // 设置更高或更正方向的光源
    scene.add(directionalLight);


    // 添加层次阴影映射
    const csm = new CSM({
      maxFar: 1000,
      cascades: 4,
      mode: "practical",
      parent: scene,
      shadowMapSize: 2048,
      lightDirection: new THREE.Vector3(-1, -1, -1).normalize(),
      lightColor: new THREE.Color(0x000020),
      lightIntensity: 0.5,
      camera,
    });

    // 添加平面
    const planeGeometry = new THREE.PlaneGeometry(50, 50, 10, 10);
    planeGeometry.rotateX(-Math.PI / 2);
    const planeMaterial = new THREE.MeshPhongMaterial({ color: "white", side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    csm.setupMaterial(planeMaterial);
    plane.receiveShadow = true;
    scene.add(plane);

    // 创建树木
    const builder = new TreeBuilder();
    const customizeTree = new CustomizeTree();
    let treeObj = customizeTree.getTree("桂花");

    builder.init(treeObj, true, "y-axis");
    let skeleton = builder.buildSkeleton();

    let lod1;
    let singleTree = builder.buildTree(skeleton);
    singleTree.children.forEach((child) => {
      child.castShadow = true; // 使每个树木部分都投射阴影
    });

    function buildtree(species, position, name) {
      // 清理同名树组
      scene.children.forEach((child) => {
        if (child.name === name) {
          scene.remove(child);
        }
      });
    
      builder.clearMesh(); // 清空之前的网格
      treeObj = customizeTree.getTree(species);
      builder.init(treeObj, true);
      skeleton = builder.buildSkeleton();
      singleTree = builder.buildTree(skeleton);
      singleTree.children.forEach((child) => {
        child.castShadow = true; // 使每个树木部分都投射阴影
      });
    
      let loader = new THREE.TextureLoader();
      let texture1 = loader.load(`${treeObj.path}texture.png`);
      texture1.colorSpace = THREE.SRGBColorSpace;
    
    //  // 替代原先加载纹理的逻辑
    // let geometry = new LeafGeometry("cross", 10, 10).generate();

    // // 使用纯色材质代替纹理材质
    // let material = new THREE.MeshBasicMaterial({
    //   color: 0x228B22, // 设置叶子的颜色 (例如森林绿)
    //   side: THREE.DoubleSide, // 确保双面可见
    //   transparent: true, // 启用透明度
    //   opacity: 0.8, // 设置透明度值
    // });

    // // 创建叶子的 Mesh
    // lod1 = new THREE.Mesh(geometry, material);
    // lod1.castShadow = true;

    
      let treeGroup = new THREE.Group();
      treeGroup.add(singleTree);
      // treeGroup.add(lod1);
      treeGroup.position.copy(position); // 设置位置
      treeGroup.name = name; // 设置唯一名称
      scene.add(treeGroup);
    }
    

    // 创建第一棵树
const species = Array.from(customizeTree.indices.keys());
buildtree(species[0], new THREE.Vector3(10, 0, 10), "普通乔木");

// 创建第二棵树
buildtree(species[1], new THREE.Vector3(8, 0, 8), "桂花");


    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      csm.update();
      renderer.render(scene, camera);
    };
    animate();

    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedObject = null;

    const handleMouseDown = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
      raycaster.setFromCamera(mouse, camera);
    
      const intersects = raycaster.intersectObjects(scene.children, true);
if (intersects.length > 0) {
  selectedObject = intersects[0].object;

  // 找到整个树组
  while (selectedObject.parent && !(selectedObject.parent instanceof THREE.Scene)) {
    selectedObject = selectedObject.parent;
  }

  if (selectedObject.name.startsWith("Tree")) {
    console.log("Selected object:", selectedObject.name); // 调试信息
    controls.enabled = false; // 禁用 OrbitControls
  }
}

    };
    
    const handleMouseMove = (event) => {
      if (selectedObject) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
        raycaster.setFromCamera(mouse, camera);
    
        const intersects = raycaster.intersectObject(plane, true);
        if (intersects.length > 0) {
          selectedObject.position.copy(intersects[0].point); // 更新整个组的位置
        }
      }
    };
    
    const handleMouseUp = () => {
      if (selectedObject) {
        console.log("Released object:", selectedObject.name); // 调试信息
      }
      selectedObject = null;
      controls.enabled = true; // 启用 OrbitControls
    };
    

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  
    // 清理函数
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100vh" }} />;
};

export default ThreeScene;
