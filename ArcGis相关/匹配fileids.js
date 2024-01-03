    /**
     * 创建并添加图形
     * @param {esri.feature} feature
     * @param {Object} popupTemplate
     * @param {Stting} popupTemplate.title
     * @param {Stting} popupTemplate.field
     * @param {Stting} popupTemplate.content
     */
    createGraphic (feature, popupTemplate) {
      let graphic
      switch (feature.geometry.type) {
      case 'point':
        graphic = new Graphic({
          geometry: feature.geometry,
          symbol: new SimpleMarkerSymbol({
            color: new Color([255, 0, 0, 0.25]),
            outline: new SimpleLineSymbol({
              cap: 'round',
              color: new Color([255, 0, 0, 1]),
              join: 'round',
              miterLimit: 1,
              style: 'solid',
              width: 1
            }),
            size: 10,
            style: 'circle'
          }),
          attributes: feature.attributes,
          popupTemplate: popupTemplate
        })
        break

      case 'polyline':
        graphic = new Graphic({
          geometry: feature.geometry,
          symbol: new SimpleLineSymbol({
            cap: 'round',
            color: new Color([255, 0, 0, 1]),
            join: 'round',
            miterLimit: 1,
            style: 'solid',
            width: 5
          }),
          attributes: feature.attributes,
          popupTemplate: popupTemplate
        })
        break

      case 'polygon':
        graphic = new Graphic({
          geometry: feature.geometry,
          symbol: new SimpleFillSymbol({
            color: new Color([255, 0, 0, 1]),
            outline: new SimpleLineSymbol({
              cap: 'round',
              color: new Color([255, 0, 0, 1]),
              join: 'round',
              miterLimit: 1,
              style: 'solid',
              width: 1
            }),
            style: 'solid'
          }),
          attributes: feature.attributes,
          popupTemplate: popupTemplate
        })
        break
      }
      return graphic || null
    }

        /**
     * 分析图层
     * @param {esri.layer} layer
     * @param {String} layerId
     */
        async analyzeLayers (layer, layerId) {
          this.analysisStart = true // 展示查询结果
          const geometry = this.bufferGeometry
          const queryObject = new Query({
            where: '1=1',
            outFields: '*',
            geometry: geometry,
            // spatialRelationship: 'contains', // 空间关系s
            returnGeometry: true
          })
    
          const queryTask = new QueryTask({
            url: `${layer.serviceUrl}/${layerId}`
          })
    
          try {
            const result = await queryTask.execute(queryObject)
            console.log('半径查询结果=》', result)
    
            if (result.features && result.features.length) {
              this.analysisResult.set(
                layer.name,
                (this.analysisResult.get(layer.name) || 0) + result.features.length
              )
              this.isShowAnalysisResult.push(layer.name)
    
              const fieldInfos = result.fields.map((field) => {
                return {
                  fieldName: field.name,
                  label: field.alias,
                  visible: true
                }
              })
    
              const popupTemplate = {
                title: '{Name}', // 使用字段的别名
                content: [
                  {
                    type: 'fields',
                    fieldInfos: fieldInfos
                  }
                ]
              }
    
              const graphics = []
    
              console.log('[ result.features ] >', result.features)
    
              this.featuresTableData = result.features.map(feature => {
                return {
                  layerName: layer.name,
                  feature: feature
                }
              })
    
              result.features.forEach((feature) => {
                const testGraphicGeometry = geometryEngine.clip(
                  feature.geometry,
                  this.bufferGeometry.extent
                )
    
                feature.geometry = testGraphicGeometry
    
                const graphic = this.createGraphic(feature, popupTemplate)
                if (!graphic) return
                this.graphicLayer.add(graphic)
                graphics.push(graphic)
              })
              this.cacheAnalysisResultGraphic.set(layer.name, graphics)
            }
          } catch (error) {
            console.error('spatial query error', error)
          }
        }