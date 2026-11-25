import { useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import SchoolIcon from "@mui/icons-material/School";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../../context/useAuth";
import { DASHBOARD_PATH } from "../../constants";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <AppBar position="sticky" sx={{ bgcolor: "#08090D", borderBottom: "1px solid #292F3B" }}>
      <Toolbar sx={{ gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            cursor: "pointer",
            flexGrow: 1,
          }}
          onClick={() => navigate(DASHBOARD_PATH[role] || "/login")}
        >
          <SchoolIcon sx={{ color: "#75D7FF" }} />
          <Typography variant="h6" sx={{ color: "#F5F3EF", fontWeight: 800 }}>
            Acade<span style={{ color: "#75D7FF" }}>X</span>
          </Typography>
        </Box>

        {role && (
          <Chip
            label={role.charAt(0).toUpperCase() + role.slice(1)}
            size="small"
            sx={{
              bgcolor: "rgba(117, 215, 255, 0.15)",
              color: "#75D7FF",
              border: "1px solid rgba(117, 215, 255, 0.3)",
              fontWeight: 700,
            }}
          />
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            src={user?.avatar}
            sx={{ bgcolor: "rgba(117, 215, 255, 0.2)", color: "#75D7FF", width: 32, height: 32, fontSize: 13, fontWeight: 700 }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
          </Avatar>
          <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" }, color: "#F5F3EF" }}>
            {user?.name}
          </Typography>
          <Button
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ color: "#A4ADBA", "&:hover": { color: "#F43F5E", bgcolor: "rgba(244, 63, 94, 0.1)" } }}
            size="small"
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
