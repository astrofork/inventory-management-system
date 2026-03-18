package com.kirana.mlDto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecommendationResponse {

  private List<Recommendation> recommendation;


  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static  class Recommendation{
    private Long itemId;
    private String itemName;
    private String category;
    private String action;
    private String reason;
    private Double growthRate;
    private Double profitMargin;
    private Integer currentStock;
    private Double score;
  }

  
}
