import { Card } from "@mui/material";
import { styled } from "@mui/material/styles";

const DashCard = styled(Card)(({ theme }) => ({
  backgroundImage: "none",
  backgroundColor: theme.palette.background.alt,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.customShadows.card,
  transition: "box-shadow 150ms ease",
  "&:hover": {
    boxShadow: theme.customShadows.cardHover,
  },
}));

export default DashCard;
