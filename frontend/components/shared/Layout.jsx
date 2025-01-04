import Footer from "./Footer";
import Header from "./Header";
const Layout = ({children}) => {
  return (
    <>
    <div className="flex flex-col ">
      <Header />
        <main className="min-h-screen grow p-5">
            {children}
        </main>
      <Footer />
    </div>
    </>
  )
}

export default Layout