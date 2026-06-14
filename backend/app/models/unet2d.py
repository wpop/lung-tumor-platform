import torch
import torch.nn as nn


class DoubleConv(nn.Module):
    """
    A small block with two convolution layers.

    Each convolution is followed by BatchNorm and ReLU.
    """

    def __init__(self, in_channels: int, out_channels: int) -> None:
        super().__init__()

        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Run the input through the double convolution block.
        """
        return self.block(x)


class UNet2D(nn.Module):
    """
    A simple 2D U-Net for binary medical image segmentation.

    The model returns raw logits. Do not apply sigmoid here when training with
    BCEWithLogitsLoss.
    """

    def __init__(self, in_channels: int = 1, out_channels: int = 1) -> None:
        super().__init__()

        # Encoder path.
        self.enc1 = DoubleConv(in_channels, 64)
        self.enc2 = DoubleConv(64, 128)
        self.enc3 = DoubleConv(128, 256)
        self.enc4 = DoubleConv(256, 512)

        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)

        # Decoder path.
        self.up3 = nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2)
        self.dec3 = DoubleConv(512, 256)

        self.up2 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.dec2 = DoubleConv(256, 128)

        self.up1 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.dec1 = DoubleConv(128, 64)

        # Final 1x1 convolution maps features to one binary mask logit channel.
        self.final_conv = nn.Conv2d(64, out_channels=out_channels, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Run a forward pass through the U-Net.
        """
        # Encode and save feature maps for skip connections.
        enc1 = self.enc1(x)
        enc2 = self.enc2(self.pool(enc1))
        enc3 = self.enc3(self.pool(enc2))
        enc4 = self.enc4(self.pool(enc3))

        # Decode and concatenate matching encoder features.
        x = self.up3(enc4)
        x = torch.cat([x, enc3], dim=1)
        x = self.dec3(x)

        x = self.up2(x)
        x = torch.cat([x, enc2], dim=1)
        x = self.dec2(x)

        x = self.up1(x)
        x = torch.cat([x, enc1], dim=1)
        x = self.dec1(x)

        return self.final_conv(x)


if __name__ == "__main__":
    model = UNet2D()
    test_input = torch.randn(4, 1, 512, 512)
    output = model(test_input)

    print(f"Output shape: {output.shape}")
