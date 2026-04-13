import { useNavigate } from "react-router-dom";
import  { useEffect, useState } from "react";
const NavBar = () =>{

const navigate = useNavigate();
const [user, setUser] = useState(null);

const handleLogout = async () => {
    await fetch("http://localhost:8000/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
}

const handleLogin = () => {
    navigate("/login");
  };


useEffect(() => {
    fetch("http://localhost:8000/me", {
      credentials: "include",
    })
      .then(async (res) => {
        if (res.status === 401) {
          // user-ul nu e logat
          setUser(null);
          return null;
        }
        if (!res.ok) throw new Error("Server error");
        return res.json();
        
      })
      .then((data) => {
        if (data) setUser(data);
      })
      .catch(() => setUser(null));

      
  }, []);
console.log(user)
return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
      <div className="text-xl font-bold">🎬 Cinema</div>

      <div className="flex items-center space-x-6">
        <a href="#" className="hover:text-gray-300">Program</a>
        <a href="#" className="hover:text-gray-300">Filme</a>
        <a href="#" className="hover:text-gray-300">Contact</a>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              👤
            </div>

            <span className="text-sm">{user.first_name} {user.last_name}</span>

            <button
              onClick={handleLogout}
              className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            className="bg-blue-500 px-4 py-2 rounded-lg hover:bg-blue-600"
            onClick={handleLogin}
          >
            Login
          </button>
        )}
      </div>
    </nav>
)
}

export default NavBar;