import * as THREE from '../build/three.module.js';

import Stats from './jsm/libs/stats.module.js';
import { GUI } from './jsm/libs/dat.gui.module.js';

import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { OutlineEffect } from './jsm/effects/OutlineEffect.js';
import { MMDLoader } from './jsm/loaders/MMDLoader.js';
import { MMDAnimationHelper } from './jsm/animation/MMDAnimationHelper.js';
import { Sky } from './jsm/objects/Sky.js';

let stats;

// IK(Inverse Kinematics)

let mesh, camera, scene, renderer, effect;
let helper, ikHelper, physicsHelper;
let sky, sun;

const clock = new THREE.Clock();

Ammo().then( function ( AmmoLib ) {

  Ammo = AmmoLib;

  init();
  animate();

} );

function initSky() {

  // Add Sky
  sky = new Sky();
  sky.scale.setScalar( 450000 );
  scene.add( sky );

  sun = new THREE.Vector3();

  /// GUI

  const effectController = {
    turbidity: 3,
    rayleigh: 0.5,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    inclination: 0.1, // elevation / inclination
    azimuth: 0.3, // Facing front,
    exposure: renderer.toneMappingExposure
  };

  function guiChanged() {

    const uniforms = sky.material.uniforms;
    uniforms[ "turbidity" ].value = effectController.turbidity;
    uniforms[ "rayleigh" ].value = effectController.rayleigh;
    uniforms[ "mieCoefficient" ].value = effectController.mieCoefficient;
    uniforms[ "mieDirectionalG" ].value = effectController.mieDirectionalG;

    const theta = Math.PI * ( effectController.inclination - 0.5 );
    const phi = 2 * Math.PI * ( effectController.azimuth - 0.5 );

    sun.x = Math.cos( phi );
    sun.y = Math.sin( phi ) * Math.sin( theta );
    sun.z = Math.sin( phi ) * Math.cos( theta );

    uniforms[ "sunPosition" ].value.copy( sun );

    renderer.toneMappingExposure = effectController.exposure;
    renderer.render( scene, camera );

  }

  const gui = new GUI();

  gui.add( effectController, "turbidity", 0.0, 20.0, 0.1 ).onChange( guiChanged );
  gui.add( effectController, "rayleigh", 0.0, 4, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "mieCoefficient", 0.0, 0.1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "mieDirectionalG", 0.0, 1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "inclination", 0, 1, 0.0001 ).onChange( guiChanged );
  gui.add( effectController, "azimuth", 0, 1, 0.0001 ).onChange( guiChanged );
  gui.add( effectController, "exposure", 0, 1, 0.0001 ).onChange( guiChanged );

  guiChanged();

}

function init() {

  const container = document.createElement( 'div' );
  document.body.appendChild( container );

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
  camera.position.z = 30;

  // scene

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xffffff );

  // const gridHelper = new THREE.PolarGridHelper( 30, 10 );
  // gridHelper.position.y = - 10;
  // scene.add( gridHelper );

  const ambient = new THREE.AmbientLight( 0x666666 );
  scene.add( ambient );

  const directionalLight = new THREE.DirectionalLight( 0x887766 );
  directionalLight.position.set( - 1, 1, 1 ).normalize();
  scene.add( directionalLight );

  //

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  effect = new OutlineEffect( renderer );

  // STATS

  stats = new Stats();
  container.appendChild( stats.dom );

  // model

  function onProgress( xhr ) {

    if ( xhr.lengthComputable ) {

      const percentComplete = xhr.loaded / xhr.total * 100;
      console.log( Math.round( percentComplete, 2 ) + '% downloaded' );

    }

  }


  // const modelFile = 'https://rawgit.com/mrdoob/three.js/dev/examples/models/mmd/miku/miku_v2.pmd';
  // const modelFile = '/models/kazii式煉獄杏寿郎ver2.0/煉獄杏寿郎(カフェ).pmx'
  const modelFile = '/models/かまぼこちゃん.pmx'
  const vmdFiles = [ 'https://rawgit.com/mrdoob/three.js/dev/examples/models/mmd/vmds/wavefile_v2.vmd' ];

  helper = new MMDAnimationHelper( {
    afterglow: 2.0
  } );

  const loader = new MMDLoader();

  loader.loadWithAnimation( modelFile, vmdFiles, function ( mmd ) {

    mesh = mmd.mesh;
    mesh.position.y = - 9.5;
    scene.add( mesh );

    helper.add( mesh, {
      animation: mmd.animation,
      physics: true
    } );

    ikHelper = helper.objects.get( mesh ).ikSolver.createHelper();
    ikHelper.visible = false;
    scene.add( ikHelper );

    physicsHelper = helper.objects.get( mesh ).physics.createHelper();
    physicsHelper.visible = false;
    scene.add( physicsHelper );

    initGui();

  }, onProgress, null);
  
  loader.loadWithAnimation( '/models/kazii式煉獄杏寿郎ver2.0/煉獄杏寿郎(カフェ).pmx', vmdFiles, function ( mmd ) {

    const mesh = mmd.mesh;
    mesh.position.y = - 10;
    mesh.position.x = - 10;
    scene.add( mesh );

    helper.add( mesh, {
      animation: mmd.animation,
      physics: true
    } );

  //   // IKを視覚化するヘルパークラス
  //   ikHelper = helper.objects.get( mesh ).ikSolver.createHelper();
  //   ikHelper.visible = false;
  //   scene.add( ikHelper );

  //   // physics(物理エンジン)を視覚化するヘルパークラス
  //   physicsHelper = helper.objects.get( mesh ).physics.createHelper();
  //   physicsHelper.visible = false;
  //   scene.add( physicsHelper );

  //   initGui();

  }, onProgress, null );

  const controls = new OrbitControls( camera, renderer.domElement );
  controls.minDistance = 10;
  controls.maxDistance = 100;

  initSky();

  const stage = '../models/円窓ステージ Ver.1.0/円窓ステージ.pmx';
  loader.load(stage, (object) => {
    object.position.y = -10;
    scene.add(object);
  });

  window.addEventListener( 'resize', onWindowResize, false );

  function initGui() {

    const api = {
      'animation': true,
      'ik': true,
      'outline': true,
      'physics': true,
      'show IK bones': false,
      'show rigid bodies': false
    };

    const gui = new GUI();

    gui.add( api, 'animation' ).onChange( function () {

      helper.enable( 'animation', api[ 'animation' ] );

    } );

    gui.add( api, 'ik' ).onChange( function () {

      helper.enable( 'ik', api[ 'ik' ] );

    } );

    gui.add( api, 'outline' ).onChange( function () {

      effect.enabled = api[ 'outline' ];

    } );

    gui.add( api, 'physics' ).onChange( function () {

      helper.enable( 'physics', api[ 'physics' ] );

    } );

    gui.add( api, 'show IK bones' ).onChange( function () {

      ikHelper.visible = api[ 'show IK bones' ];

    } );

    gui.add( api, 'show rigid bodies' ).onChange( function () {

      if ( physicsHelper !== undefined ) physicsHelper.visible = api[ 'show rigid bodies' ];

    } );

  }

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  effect.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {

  requestAnimationFrame( animate );

  stats.begin();
  render();
  stats.end();

}

function render() {

  helper.update( clock.getDelta() );
  effect.render( scene, camera );

}