// svg.filter.js 0.4 - Copyright (c) 2013-2014 Wout Fierens - Licensed under the MIT license
;(function() {

  // Main filter class
  SVG.Filter = SVG.invent({
    create: 'filter',
    inherit: SVG.Parent,
    extend: {
      // Static strings
      source:           'SourceGraphic',
      sourceAlpha:      'SourceAlpha',
      background:       'BackgroundImage',
      backgroundAlpha:  'BackgroundAlpha',
      fill:             'FillPaint',
      stroke:           'StrokePaint',

      autoSetIn: true,
      // Custom put method for leaner code
      put: function(element, i) {
        this.add(element, i)

        if(!element.attr('in') && this.autoSetIn){
          element.attr('in',this.source);
        }
        if(!element.attr('result')){
          element.attr('result',element);
        }

        return element;
      },
      // Blend effect
      blend: function(in1, in2, mode) {
        return this.put(new SVG.BlendEffect(in1, in2, mode) );
      },
      // ColorMatrix effect
      colorMatrix: function(type, values) {
        return this.put(new SVG.ColorMatrixEffect(type, values));
      },
      // ConvolveMatrix effect
      convolveMatrix: function(matrix) {
        return this.put(new SVG.ConvolveMatrixEffect(matrix));
      },
      // ComponentTransfer effect
      componentTransfer: function(components) {
        return this.put(new SVG.ComponentTransferEffect(components));
      },
      // Composite effect
      composite: function(in1, in2, operator) {
        return this.put(new SVG.CompositeEffect(in1, in2, operator));
      },
      // Flood effect
      flood: function(color) {
        return this.put(new SVG.FloodEffect(color));
      },
      // Offset effect
      offset: function(x, y) {
        return this.put(new SVG.OffsetEffect(x,y));
      },
      // Image effect
      image: function(src) {
        return this.put(new SVG.ImageEffect(src));
      },
      // Merge effect
      merge: function() {
        //pass the array of arguments to the constructor because we dont know if the user gave us an array as the first arguemnt or wether they listed the effects in the arguments
        var args = [undefined];
        for(var i in arguments) args.push(arguments[i]);
        return this.put(new (SVG.MergeEffect.bind.apply(SVG.MergeEffect,args)));
      },
      // Gaussian Blur effect
      gaussianBlur: function(x,y) {
        return this.put(new SVG.GaussianBlurEffect(x,y));
      },
      // Morphology effect
      morphology: function(operator,radius){
        return this.put(new SVG.MorphologyEffect(operator,radius));
      },
      // DiffuseLighting effect
      diffuseLighting: function(surfaceScale,diffuseConstant,kernelUnitLength){
        return this.put(new SVG.DiffuseLightingEffect(surfaceScale,diffuseConstant,kernelUnitLength));
      },
      // DisplacementMap effect
      displacementMap: function(in1,in2,scale,xChannelSelector,yChannelSelector){
        return this.put(new SVG.DisplacementMapEffect(in1,in2,scale,xChannelSelector,yChannelSelector));
      },
      // SpecularLighting effect
      specularLighting: function(surfaceScale,diffuseConstant,specularExponent,kernelUnitLength){
        return this.put(new SVG.SpecularLightingEffect(surfaceScale,diffuseConstant,specularExponent,kernelUnitLength));
      },
      // Tile effect
      tile: function(){
        return this.put(new SVG.TileEffect());
      },
      // Turbulence effect
      turbulence: function(baseFrequency,numOctaves,seed,stitchTiles,type){
        return this.put(new SVG.TurbulenceEffect(baseFrequency,numOctaves,seed,stitchTiles,type));
      },
      // Default string value
      toString: function() {
        return 'url(#' + this.attr('id') + ')'
      }
    }
  });

  //add .filter function
  SVG.extend(SVG.Defs, {
    // Define filter
    filter: function(block) {
      var filter = this.put(new SVG.Filter)

      /* invoke passed block */
      if (typeof block === 'function')
        block.call(filter, filter)

      return filter
    }
  });
  SVG.extend(SVG.Container, {
    // Define filter on defs
    filter: function(block) {
      return this.defs().filter(block)
    }
  });
  SVG.extend(SVG.Element, SVG.G, SVG.Nested, {
    // Create filter element in defs and store reference
    filter: function(block) {
      this.filterer = block instanceof SVG.Element ?
        block : this.doc().filter(block)

      if(this.doc() && this.filterer.doc() !== this.doc()){
        this.doc().defs().add(this.filterer);
      }

      this.attr('filter', this.filterer)

      return this.filterer
    },
    // Remove filter
    unfilter: function(remove) {
      /* also remove the filter node */
      if (this.filterer && remove === true)
        this.filterer.remove()

      /* delete reference to filterer */
      delete this.filterer

      /* remove filter attribute */
      return this.attr('filter', null)
    }
  });

  // Create SVG.Effect class
  SVG.Effect = SVG.invent({
    create: function(){
      this.constructor.call(this);
    },
    inherit: SVG.Element,
    extend: {
      // Set in attribute
      in: function(effect) {
        return this.attr('in', effect)
      },
      // Named result
      result: function() {
        return this.attr('result') || this.attr('id') + 'Out';
      },
      // Stringification
      toString: function() {
        return this.result();
      }
    }
  })

  // create class for parent effects like merge
  // Inherit from SVG.Parent
  SVG.ParentEffect = SVG.invent({
    create: function(){
      this.constructor.call(this)
    },
    inherit: SVG.Parent,
    extend: {
      // Set in attribute
      in: function(effect) {
        return this.attr('in', effect)
      },
      // Named result
      result: function() {
        return this.attr('result') || this.attr('id') + 'Out'
      },
      // Stringification
      toString: function() {
        return this.result()
      }
    }
  })

  //crea class for child effects, like MergeNode, FuncR and lights
  SVG.ChildEffect = SVG.invent({
    create: function(){
      this.constructor.call(this)
    },
    inherit: SVG.Element,
    extend: {
    in: function(effect){
      this.attr('in',effect)
    }
    //dont include any "result" functions because these types of nodes dont have them
    }
  })

  // Create all different effects
  var effects = {
    blend: function(in1,in2,mode){
      this.attr({
        in: in1,
        in2: in2,
        mode: mode || 'normal'
      })
    },
    colorMatrix: function(type,values){
      if (type == 'matrix')
        values = normaliseMatrix(values)

      this.attr({
        type:   type
      , values: typeof values == 'undefined' ? null : values
      })
    },
    convolveMatrix: function(matrix){
      matrix = normaliseMatrix(matrix)

      this.attr({
        order:        Math.sqrt(matrix.split(' ').length)
      , kernelMatrix: matrix
      })
    },
    composite: function(in1, in2, operator){
      this.attr({
        in: in1,
        in2: in2,
        operator: operator
      })
    },
    flood: function(color){
      this.attr('flood-color',color)
    },
    offset: function(x,y){
      this.attr({
        dx: x,
        dy: y
      })
    },
    image: function(src){
      this.attr('href', src, SVG.xlink)
    },
    displacementMap: function(in1,in2,scale,xChannelSelector,yChannelSelector){
      this.attr({
        in: in1,
        in2: in2,
        scale: scale,
        xChannelSelector: xChannelSelector,
        yChannelSelector: yChannelSelector
      })
    },
    gaussianBlur: function(x,y){
      if(arguments.length > 0)
        this.attr('stdDeviation', listString(Array.prototype.slice.call(arguments)))
      else
        this.attr('stdDeviation', '0 0')
    },
    morphology: function(operator,radius){
      this.attr({
        operator: operator,
        radius: radius
      })
    },
    tile: function(){

    },
    turbulence: function(baseFrequency,numOctaves,seed,stitchTiles,type){
      this.attr({
        numOctaves: numOctaves,
        seed: seed,
        stitchTiles: stitchTiles,
        baseFrequency: baseFrequency,
        type: type
      })
    }
  }

  // Create all parent effects
  var parentEffects = {
    merge: function(){
      var children

      //test to see if we have a set
      if(arguments[0] instanceof SVG.Set){
        var that = this
        arguments[0].each(function(i){
          if(this instanceof SVG.MergeNode)
            that.put(this)
          else if(this instanceof SVG.Effect || this instanceof SVG.ParentEffect)
            that.put(new SVG.MergeNode(this))
        })
      }
      else{
        //if the first argument is an array use it
        if(Array.isArray(arguments[0]))
          children = arguments[0]
        else
          children = arguments

        for(var i = 0; i < children.length; i++){
          if(children[i] instanceof SVG.MergeNode){
            this.put(children[i])
          }
          else this.put(new SVG.MergeNode(children[i]))
        }
      }
    },
    componentTransfer: function(compontents){
      /* create rgb set */
      this.rgb = new SVG.Set

      /* create components */
      ;(['r', 'g', 'b', 'a']).forEach(function(c) {
        /* create component */
        this[c] = new SVG['Func' + c.toUpperCase()]('identity')

        /* store component in set */
        this.rgb.add(this[c])

        /* add component node */
        this.node.appendChild(this[c].node)
      }.bind(this)) //lost context in foreach

      /* set components */
      if (compontents) {
        if (compontents.rgb) {
          /* set bundled components */
          ;(['r', 'g', 'b']).forEach(function(c) {
            this[c].attr(compontents.rgb)
          }.bind(this))

          delete compontents.rgb
        }

        /* set individual components */
        for (var c in compontents)
          this[c].attr(compontents[c])
      }
    },
    diffuseLighting: function(surfaceScale,diffuseConstant,kernelUnitLength){
      this.attr({
        surfaceScale: surfaceScale,
        diffuseConstant: diffuseConstant,
        kernelUnitLength: kernelUnitLength
      })
    },
    specularLighting: function(surfaceScale,diffuseConstant,specularExponent,kernelUnitLength){
      this.attr({
        surfaceScale: surfaceScale,
        diffuseConstant: diffuseConstant,
        specularExponent: specularExponent,
        kernelUnitLength: kernelUnitLength
      })
    },
  }

  // Create child effects like PointLight and MergeNode
  var childEffects = {
    distantLight: function(azimuth, elevation){
      this.attr({
        azimuth: azimuth,
        elevation: elevation
      })
    },
    pointLight: function(x,y,z){
      this.attr({
        x: x,
        y: y,
        z: z
      })
    },
    spotLight: function(x,y,z,pointsAtX,pointsAtY,pointsAtZ){
      this.attr({
        x: x,
        y: y,
        z: z,
        pointsAtX: pointsAtX,
        pointsAtY: pointsAtY,
        pointsAtZ: pointsAtZ
      })
    },
    mergeNode: function(in1){
      this.attr('in',in1)
    }
  }

  // Create compontent functions
  ;(['r', 'g', 'b', 'a']).forEach(function(c) {
    /* create class */
    childEffects['Func' + c.toUpperCase()] = function(type) {
      this.attr('type',type)

      // take diffent arguments based on the type
      switch(type){
        case 'table':
          this.attr('tableValues',arguments[1])
          break
        case 'linear':
          this.attr('slope',arguments[1])
          this.attr('intercept',arguments[2])
          break
        case 'gamma':
          this.attr('amplitude',arguments[1])
          this.attr('exponent',arguments[2])
          this.attr('offset',arguments[2])
          break
      }
    }
  })

  //create effects
  foreach(effects,function(effect,i){

    /* capitalize name */
    var name = i.charAt(0).toUpperCase() + i.slice(1)
    var proto = {}

    /* make all effects interchainable */
    foreach(effects,parentEffects,function(effect,e){
      proto[e] = function() {
        return this.parent[e].apply(this.parent, arguments).in(this)
      }
    })

    /* create class */
    SVG[name + 'Effect'] = SVG.invent({
      create: function() {
        //call super
        this.constructor.call(this, SVG.create('fe' + name))

        //call constructor for this effect
        effect.apply(this,arguments)
      },
      inherit: SVG.Effect,
      extend: proto
    })
  })

  //create parent effects
  foreach(parentEffects,function(effect,i){

    /* capitalize name */
    var name = i.charAt(0).toUpperCase() + i.slice(1)
    var proto = {}

    /* make all effects interchainable */
    foreach(effects,parentEffects,function(effect,e){
      proto[e] = function() {
        return this.parent() && this.parent()[e].apply(this.parent(), arguments).in(this)
      }
    })

    /* create class */
    SVG[name + 'Effect'] = SVG.invent({
      create: function() {
        //call super
        this.constructor.call(this, SVG.create('fe' + name))

        //call constructor for this effect
        effect.apply(this,arguments)
      },
      inherit: SVG.ParentEffect,
      extend: proto
    })
  })

  //create child effects
  foreach(childEffects,function(effect,i){

    /* capitalize name */
    var name = i.charAt(0).toUpperCase() + i.slice(1)
    var proto = {}

    /* create class */
    SVG[name] = SVG.invent({
      create: function() {
        //call super
        this.constructor.call(this, SVG.create('fe' + name))

        //call constructor for this effect
        effect.apply(this,arguments)
      },
      inherit: SVG.ChildEffect,
      extend: proto
    })
  })

  // Effect-specific extensions
  SVG.extend(SVG.MergeEffect,{
    in: function(effect){
      if(effect instanceof SVG.MergeNode)
        this.add(effect,0)
      else
        this.add(new SVG.MergeNode(effect),0)

      return this
    }
  })

  // Presets
  SVG.filter = {
    sepiatone:  [ .343, .669, .119, 0, 0
                , .249, .626, .130, 0, 0
                , .172, .334, .111, 0, 0
                , .000, .000, .000, 1, 0 ]
  }

  // Helpers
  function normaliseMatrix(matrix) {
    /* convert possible array value to string */
    if (Array.isArray(matrix))
      matrix = new SVG.Array(matrix)

    /* ensure there are no leading, tailing or double spaces */
    return matrix.toString().replace(/^\s+/, '').replace(/\s+$/, '').replace(/\s+/g, ' ')
  }

  function listString(list) {
    if (!Array.isArray(list))
      return list

    for (var i = 0, l = list.length, s = []; i < l; i++)
      s.push(list[i])

    return s.join(' ')
  }

  function foreach(){ //loops through mutiple objects
    var fn = function(){}
    if(typeof arguments[arguments.length-1] == 'function'){
      fn = arguments[arguments.length-1]
      Array.prototype.splice.call(arguments,arguments.length-1,1)
    }
    for(var k in arguments){
      for(var i in arguments[k]){
        fn(arguments[k][i],i,arguments[k])
      }
    }
  }

}).call(this)
