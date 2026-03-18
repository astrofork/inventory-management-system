package com.kirana.mlDto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TrendResponse {

  private List<Trend> trends;



  @Data
  @JsonIgnoreProperties(ignoreUnknown=true)
  public static class Trend {

    private String category;
    private String trend;
    private Double growthRate;
    private Double totalSales;
    
  }



  
}
