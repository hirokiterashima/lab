/*global define, $, d3 */

define(function (require) {

  var labConfig = require('lab.config'),
      Nucleotide = require('md2d/views/nucleotide'),

      SCALE = 0.007,
      W = {
        "CELLS": 720,
        "DNA1": 661,
        "DNA2": 720,
        "DNA3": 337.4,
        "POLY_UNDER": 426.15,
        "POLY_OVER": 402.525
      },
      H = {
        "CELLS": 500,
        "DNA1": 550,
        "DNA2": 414.263,
        "DNA3": 89.824,
        "POLY_UNDER": 368.6,
        "POLY_OVER": 368.6
      };

  (function () {
    var name;
    for (name in W) {
      if (W.hasOwnProperty(name)) {
        W[name] *= SCALE;
      }
    }
    for (name in H) {
      if (H.hasOwnProperty(name)) {
        H[name] *= SCALE;
      }
    }
  }());

  function GeneticRenderer(container, parentView, model) {
    this.container = container;
    this.parent = parentView;
    this.model = model;
    this.model2px = parentView.model2px;
    this.model2pxInv = parentView.model2pxInv;
    this.modelSize2px = parentView.modelSize2px;

    this._g = null;
    this._dnaG = null;
    this._dnaCompG = null;
    this._mrnaG = null;
    this._dna = [];
    this._dnaComp = [];
    this._mrna = [];
    this._currentTrans = null;
    // Redraw DNA / mRNA on every genetic properties change.
    this.model.getGeneticProperties().on("change", $.proxy(this.render, this));
    this.model.getGeneticProperties().on("separateDNA", $.proxy(this.separateDNA, this));
    this.model.getGeneticProperties().on("transcribeStep", $.proxy(this.transcribeStep, this));
    this.model.getGeneticProperties().on("playIntro", $.proxy(this.playIntro, this));
    this.model.getGeneticProperties().on("prepareForTranslation", $.proxy(this.prepareForTranslation, this));
  }

  GeneticRenderer.prototype.playIntro = function () {
    var ms2px = this.modelSize2px,
        cx = this.modelSize2px(W.CELLS * 0.567),
        cy = this.modelSize2px(H.CELLS * 0.445),
        mWidth  = this.modelSize2px(this.model.get("width")),
        mHeight = this.modelSize2px(this.model.get("height")),
        dna3units = 14,
        introG, dna3, t;

    this._g.selectAll(".dna-intro").remove();
    introG = this._g.append("g").attr({
      "class": "dna-intro",
      "transform": "translate(" + cx + " " + cy + ")"
    });

    introG.append("image").attr({
      "class": "cells",
      "x": -cx,
      "y": -cy,
      "width": this.modelSize2px(W.CELLS),
      "height": this.modelSize2px(H.CELLS),
      "preserveAspectRatio": "none",
      "xlink:href": labConfig.actualRoot + "../../resources/dnaintro/Cells.svg"
    });

    introG.append("image").attr({
      "class": "dna1",
      "x": this.modelSize2px(W.DNA1 * -0.5),
      "y": this.modelSize2px(H.DNA1 * -0.5),
      "width": this.modelSize2px(W.DNA1),
      "height": this.modelSize2px(H.DNA1),
      "transform": "scale(0.13)",
      "preserveAspectRatio": "none",
      "xlink:href": labConfig.actualRoot + "../../resources/dnaintro/DNA_InsideNucleus_1.svg"
    }).style("opacity", 0);

    introG.append("image").attr({
      "class": "dna2",
      "x": this.modelSize2px(W.DNA2 * -0.5),
      "y": this.modelSize2px(H.DNA2 * -0.404),
      "width": this.modelSize2px(W.DNA2),
      "height": this.modelSize2px(H.DNA2),
      "preserveAspectRatio": "none",
      "xlink:href": labConfig.actualRoot + "../../resources/dnaintro/DNA_InsideNucleus_2.svg"
    }).style("opacity", 0);

    introG.append("image").attr({
      "class": "polymerase-under",
      "x": this.modelSize2px(W.POLY_UNDER * -0.5),
      "y": this.modelSize2px(H.POLY_UNDER * -0.5),
      "width": this.modelSize2px(W.POLY_UNDER),
      "height": this.modelSize2px(H.POLY_UNDER),
      "preserveAspectRatio": "none",
      "transform": "translate(" + mWidth * -0.65 + ", " + mHeight * -0.5 + ") scale(0.2)",
      "xlink:href": labConfig.actualRoot + "../../resources/dnaintro/Polymerase_Under.svg"
    }).style("opacity", 1);

    dna3 = introG.append("g").attr({
      "class": "dna3",
      "transform": "scale(0.2)"
    }).style("opacity", 0);

    dna3.selectAll("dna3-unit").data(new Array(dna3units)).enter().append("image").attr({
      "class": "dna3-unit",
      "x": function (d, i) { return (i - dna3units * 0.5) * ms2px(W.DNA3) * 0.98; },
      "y": this.modelSize2px(H.DNA3 * -0.5),
      "width": this.modelSize2px(W.DNA3),
      "height": this.modelSize2px(H.DNA3),
      // "transform": "scale(0.13)",
      "preserveAspectRatio": "none",
      "xlink:href": labConfig.actualRoot + "../../resources/dnaintro/DoubleHelix_Unit.svg"
    });

    introG.append("image").attr({
      "class": "polymerase-over",
      "x": this.modelSize2px(W.POLY_OVER * -0.5),
      "y": this.modelSize2px(H.POLY_OVER * -0.5),
      "width": this.modelSize2px(W.POLY_OVER),
      "height": this.modelSize2px(H.POLY_OVER),
      "preserveAspectRatio": "none",
      "transform": "scale(0.8)",
      "xlink:href": labConfig.actualRoot + "../../resources/dnaintro/Polymerase_Over.svg"
    }).style("opacity", 0);

    t = this._nextTrans().ease("cubic").duration(5000);
    t.select(".cells")
      .attr("transform", "scale(12)");  // 1.0  * 12
    t.select(".dna1")
      .attr("transform", "scale(1.56)") // 0.13 * 12
      // Of course max value for opacity is 1. However value bigger than 1
      // affects transition progress and in this case it's helpful.
      .style("opacity", 5);


    t.select(".dna-intro").ease("cubic-in-out")
      .attr("transform", "translate(" + mWidth * 0.5 + " " + mHeight * 0.5 + ")");

    t = this._nextTrans().ease("linear").duration(2000);
    t.select(".dna1")
      .style("opacity", 0)
      .attr("transform", "scale(3.12)"); // 1.56 * 2
    t.select(".dna2")
      .style("opacity", 1)
      .attr("transform", "scale(2)");    // 1.0  * 2

    t = this._nextTrans().ease("linear").duration(2000);
    t.select(".dna2")
      .style("opacity", 0)
      .attr("transform", "scale(3.8)");
    t.select(".dna3")
      .style("opacity", 1)
      .attr("transform", "scale(0.4)");

    t = this._nextTrans().ease("quad-out").duration(3500);
    t.select(".dna3")
      .attr("transform", "scale(0.6)");

    t = this._nextTrans().ease("quad-out").duration(3000);
    t.select(".polymerase-under")
      .attr("transform", "translate(0, 0) scale(0.8)");

    t = this._nextTrans().ease("cubic-in-out").duration(1000);
    t.select(".polymerase-under")
      .attr("transform", "scale(1)");
    t.select(".polymerase-over")
      .attr("transform", "scale(1)")
      .style("opacity", 1);

    t = this._nextTrans().duration(2000);
    t.selectAll(".polymerase-under, .polymerase-over")
      .attr("transform", "scale(2.5)");  // 1.0 * 2.5
    t.selectAll(".dna3")
      .attr("transform", "scale(1.5)");  // 0.6 * 2.5

    t = this._nextTrans().duration(700);
    t.select(".dna-intro")
      .style("opacity", 0)
      .remove();

    /*
    // Circle (cx, cy) point. Useful for debugging and fitting objects in a right place.
    introG.append("circle").attr({
      "class": "ctr",
      "cx": 0,
      "cy": 0,
      "r": 10,
      "fill": "red"
    });
    */
  };

  GeneticRenderer.prototype.prepareForTranslation = function () {
    var mWidth  = this.modelSize2px(this.model.get("width")),
        mHeight = this.modelSize2px(this.model.get("height")),
        originalBg = this.model.get("backgroundColor");

    this._g.insert("image", ".dna-view").attr({
      "class": "polymerase-under",
      "x": this.modelSize2px(W.POLY_UNDER * -0.5),
      "y": this.modelSize2px(H.POLY_UNDER * -0.5),
      "width": this.modelSize2px(W.POLY_UNDER),
      "height": this.modelSize2px(H.POLY_UNDER),
      "preserveAspectRatio": "none",
      "transform": "translate(" + mWidth * 0.5 + ", " + mHeight * 0.5 + ") scale(2.5)",
      "xlink:href": labConfig.actualRoot + "../../resources/dnaintro/Polymerase_Under.svg"
    }).style("opacity", 0);

    this._g.append("image").attr({
      "class": "polymerase-over",
      "x": this.modelSize2px(W.POLY_OVER * -0.5),
      "y": this.modelSize2px(H.POLY_OVER * -0.5),
      "width": this.modelSize2px(W.POLY_OVER),
      "height": this.modelSize2px(H.POLY_OVER),
      "preserveAspectRatio": "none",
      "transform": "translate(" + mWidth * 0.5 + ", " + mHeight * 0.5 + ") scale(2.5)",
      "xlink:href": labConfig.actualRoot + "../../resources/dnaintro/Polymerase_Over.svg"
    }).style("opacity", 0);

    this._nextTrans().ease("cubic-in-out").duration(1500)
      .select(".dna-view")
        .attr("transform", "translate(" + this.modelSize2px(2 * Nucleotide.WIDTH) + ")");

    this._nextTrans().ease("cubic-in-out").duration(700)
      .selectAll(".polymerase-under, .polymerase-over")
        .style("opacity", 1);

    // Restore original background.
    this._currentTrans.each("end", function () {
      d3.select(".plot").style("fill", originalBg);
    });

    this._nextTrans().ease("cubic-in-out").duration(1500)
      .selectAll(".polymerase-under, .polymerase-over")
        .attr("transform", "translate(0, " + mHeight * 0.5 + ") scale(2.5) translate(" + this.modelSize2px(W.POLY_UNDER * -0.5) + ")");
  };

  GeneticRenderer.prototype.render = function () {
    var props = this.model.getGeneticProperties().get();

    if (props === undefined) {
      return;
    }

    this.container.selectAll("g.genetics").remove();
    this._g = this.container.append("g").attr("class", "genetics");

    this._currentTrans = null;

    this._renderDNA(props.DNA, props.DNAComplement, props.mRNA);
    this._renderBackground();
  };

  GeneticRenderer.prototype.separateDNA = function (suppressAnimation) {
    // When animation is disabled (e.g. during initial rendering), main group element
    // is used as a root instead of d3 transition object.
    var selection = suppressAnimation ? this._g : this._nextTrans().duration(1500),
        i, len;

    selection.select(".dna").attr("transform",
      "translate(0, " + this.model2pxInv(this.model.get("height") / 2 + 2.5 * Nucleotide.HEIGHT) + ")");
    selection.select(".dna-comp").attr("transform",
      "translate(0, " + this.model2pxInv(this.model.get("height") / 2 - 2.5 * Nucleotide.HEIGHT) + ")");

    for (i = 0, len = this._dna.length; i < len; i++) {
      this._dna[i].hideBonds(suppressAnimation);
      this._dnaComp[i].hideBonds(suppressAnimation);
    }
  };

  GeneticRenderer.prototype.transcribeStep = function () {
    var props  = this.model.getGeneticProperties().get(),
        index  = props.mRNA.length - 1, // last element
        type   = props.mRNA[index],
        trans  = this._nextTrans().duration(500),
        t, r;

    this._mrna.push(new Nucleotide(this._mrnaG, this.modelSize2px, type, 1, index, true));
    this._mrna[index].hideBonds(true);

    // While adding a new mRNA segment, choose a random starting point along a
    // circle with a certain radius that extends beyond the top DNA strand.
    // Use parametric circle equation: x = r cos(t), y = r sin(t)
    // Limit range of the "t" parameter to: [0.25 * PI, 0.75 * PI) and [1.25 * PI, 1.75 * PI),
    // so new mRNA segments will come only from the top or bottom side of the container.
    t = Math.random() >= 0.5 ? Math.PI * 0.25 : Math.PI * 1.25;
    t += Math.random() * Math.PI * 0.5;
    r = Nucleotide.HEIGHT * 6;
    this._mrnaG.select(".nucleotide:last-child")
      .attr("transform", "translate(" + this.modelSize2px(r * Math.cos(t)) + ", " + this.modelSize2px(r * Math.sin(t)) + ")")
      .style("opacity", 0);

    trans.select(".mrna .nucleotide:last-child")
      .attr("transform", "translate(0, 0)")
      .style("opacity", 1)
        // Subselection of bonds.
        .select(".bonds")
          .ease("linear")
          .style("opacity", 1);

    trans.select(".dna-comp .nucleotide:nth-child(" + (index + 1) + ") .bonds")
      .ease("linear")
      .style("opacity", 1);

    this._scrollContainer();
  };

  GeneticRenderer.prototype._scrollContainer = function (suppressAnimation) {
    var shift = Math.min(this._mrna.length, this._dna.length - 4);

    if (shift > 10) {
      (suppressAnimation ? this._g.select(".dna-view") : this._currentTrans.select(".dna-view").ease("linear"))
        .attr("transform", "translate(" + this.modelSize2px(-(shift - 10) * Nucleotide.WIDTH) + ")");
    }
  };

  GeneticRenderer.prototype._renderDNA = function (dna, dnaComplement, mRNA) {
    var dnaView =  this._g.append("g").attr("class", "dna-view"),
        i, len;

    this._dnaG     = dnaView.append("g").attr("class", "dna"),
    this._dnaCompG = dnaView.append("g").attr("class", "dna-comp"),
    this._mrnaG    = dnaView.append("g").attr("class", "mrna"),
    this._dna      = [];
    this._dnaComp  = [];
    this._mrna     = [];

    for (i = 0, len = dna.length; i < len; i++) {
      this._dna.push(new Nucleotide(this._dnaG, this.modelSize2px, dna[i], 1, i));
    }
    this._dnaG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 + Nucleotide.HEIGHT) + ")");

    for (i = 0, len = dnaComplement.length; i < len; i++) {
      this._dnaComp.push(new Nucleotide(this._dnaCompG, this.modelSize2px, dnaComplement[i], 2, i));
    }
    this._dnaCompG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 - Nucleotide.HEIGHT) + ")");

    if (typeof mRNA !== "undefined") {
      this.separateDNA(true);
      for (i = 0, len = mRNA.length; i < len; i++) {
        this._mrna.push(new Nucleotide(this._mrnaG, this.modelSize2px, mRNA[i], 1, i, true));
        this._dnaComp[i].showBonds(true);
      }
    }
    this._mrnaG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 - 0.5 * Nucleotide.HEIGHT) + ")");

    this._scrollContainer(true);
  };

  GeneticRenderer.prototype._renderBackground = function () {
    var gradient = this._g.append("defs").append("linearGradient")
      .attr("id", "transcription-bg")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop")
      .attr("stop-color", "#C8DD69")
      .attr("offset", "0%");
    gradient.append("stop")
      .attr("stop-color", "#778B3D")
      .attr("offset", "100%");

    d3.select(".plot").style("fill", "url(#transcription-bg)");
  };

  /**
   * Returns a new chained transition.
   * This transition will be executed when previous one ends.
   *
   * @private
   * @return {d3 transtion} d3 transtion object.
   */
  GeneticRenderer.prototype._nextTrans = function () {
    // TODO: this first check is a workaround.
    // Ideal scenario would be to call always:
    // this._currentTrans[name] = this._currentTrans[name].transition();
    // but it seems to fail when transition has already ended.
    if (this._currentTrans && this._currentTrans.node().__transition__) {
      // Some transition is currently in progress, chain a new transition.
      this._currentTrans = this._currentTrans.transition();
    } else {
      // All transitions ended, just create a new one.
      this._currentTrans = d3.transition();
    }
    return this._currentTrans;
  };

  return GeneticRenderer;
});
