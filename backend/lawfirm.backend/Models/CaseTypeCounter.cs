namespace lawfirm.backend.Models;

/// <summary>
/// Keeps track of the next sequential case number per case type prefix (e.g., FAM -> 1, PI -> 1).
/// </summary>
public class CaseTypeCounter
{
    public string CaseTypeCode { get; set; } = string.Empty; // Primary Key e.g. "FAM", "PI"

    public int NextNumber { get; set; } = 1;
}
