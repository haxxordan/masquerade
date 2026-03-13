namespace DatingApi.Features;

public class FeatureFlagsOptions
{
    public MatchingFeatureFlags Matching { get; set; } = new();
    public MessagingFeatureFlags Messaging { get; set; } = new();
}

public class MatchingFeatureFlags
{
    public bool TopPicksV1 { get; set; }
    public bool ScoreV2 { get; set; }
}

public class MessagingFeatureFlags
{
    public bool SmartOpenersV1 { get; set; }
    public bool StallNudgesV1 { get; set; }
}
